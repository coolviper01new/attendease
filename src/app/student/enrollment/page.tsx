
'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc } from 'firebase/firestore';
import type { Subject, Registration } from '@/lib/types';
import { groupBy } from 'lodash';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SubjectEnrollmentCard({ 
    subjectCode, 
    subjects, 
    userRegistrations, 
    isLoading,
    onEnrollmentChange
}: { 
    subjectCode: string;
    subjects: Subject[];
    userRegistrations: Registration[] | null;
    isLoading: boolean;
    onEnrollmentChange: (status: 'success' | 'error', message: string, description?: string) => void;
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const representativeSubject = subjects[0];
    const availableBlocks = subjects.map(s => s.block);

    const handleEnroll = async () => {
        if (!user || !selectedBlock) {
            onEnrollmentChange('error', 'Selection Incomplete', 'Please select a block.');
            return;
        }

        const subjectToEnroll = subjects.find(s => s.block === selectedBlock);
        if (!subjectToEnroll) {
            onEnrollmentChange('error', 'Error', 'Selected subject block not found.');
            return;
        }
        
        const isAlreadyRegistered = userRegistrations?.some(reg => reg.subjectId === subjectToEnroll.id);
        if (isAlreadyRegistered) {
            onEnrollmentChange('error', 'Already Registered', `You are already enrolled in this subject.`);
            return;
        }

        setIsSubmitting(true);
        const registrationData = {
            studentId: user.uid,
            subjectId: subjectToEnroll.id,
            blockId: subjectToEnroll.block,
            registrationDate: serverTimestamp(),
        };
        const registrationRef = collection(firestore, 'users', user.uid, 'registrations');
        
        addDoc(registrationRef, registrationData).then(() => {
            onEnrollmentChange('success', 'Enrollment Successful', `You have been enrolled in ${subjectToEnroll.name} (${selectedBlock}).`);
            setSelectedBlock(null);
        }).catch(error => {
            const newDocId = "new_registration_id";
            const newDocRef = doc(registrationRef, newDocId);
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: newDocRef.path,
                    operation: 'create',
                    requestResourceData: registrationData
                })
            );
            onEnrollmentChange('error', 'Enrollment Failed', 'Could not process your enrollment. Please try again.');
        }).finally(() => {
            setIsSubmitting(false);
        });
    };
    
    const isEnrolledInThisCourse = userRegistrations?.some(reg => subjects.some(s => s.id === reg.subjectId));


    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="font-headline text-xl mb-1">{representativeSubject.name}</CardTitle>
                        <CardDescription>{representativeSubject.code} | {representativeSubject.credits} credits</CardDescription>
                    </div>
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-sm text-muted-foreground pt-2">{representativeSubject.description}</p>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {representativeSubject.lectureSchedules.map((schedule, index) => (
                    <div key={`lec-${index}`} className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-foreground">Lec: {schedule.day}, {schedule.startTime} - {schedule.endTime} @ {schedule.room}</span>
                    </div>
                ))}
                {representativeSubject.hasLab && representativeSubject.labSchedules?.map((schedule, index) => (
                    <div key={`lab-${index}`} className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-foreground">Lab: {schedule.day}, {schedule.startTime} - {schedule.endTime} @ {schedule.room}</span>
                    </div>
                ))}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Select
                    onValueChange={setSelectedBlock}
                    value={selectedBlock || ''}
                    disabled={isLoading || isEnrolledInThisCourse}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a block..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableBlocks.map(block => (
                            <SelectItem key={block} value={block}>{block}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleEnroll} disabled={isLoading || isSubmitting || !selectedBlock || isEnrolledInThisCourse} className="w-full sm:w-auto">
                    {isEnrolledInThisCourse ? 'Enrolled' : (isSubmitting ? 'Enrolling...' : 'Enroll')}
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function EnrollmentPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [alert, setAlert] = useState<{status: 'success' | 'error', title: string, description?: string} | null>(null);

  const subjectsQuery = useMemoFirebase(() => query(collection(firestore, 'subjects'), where('enrollmentStatus', '==', 'open')), [firestore]);
  const { data: allSubjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);
  
  const registrationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'registrations'));
  }, [firestore, user]);
  const { data: userRegistrations, isLoading: areRegsLoading, forceRefresh } = useCollection<Registration>(registrationsQuery);

  const groupedSubjects = useMemo(() => {
    if (!allSubjects) return {};
    return groupBy(allSubjects, 'code');
  }, [allSubjects]);
  
  const handleEnrollmentChange = (status: 'success' | 'error', title: string, description?: string) => {
    setAlert({status, title, description});
    if(status === 'success') {
      forceRefresh();
    }
    setTimeout(() => setAlert(null), 5000);
  }

  const availableSubjectCodes = Object.keys(groupedSubjects);
  const isLoading = isUserLoading || areSubjectsLoading || areRegsLoading;

  return (
    <>
      <PageHeader
        title="Subject Enrollment"
        description="Browse available subjects for the current semester and enroll."
      />
      
      {alert && (
        <Alert variant={alert.status === 'error' ? 'destructive' : 'default'} className="mb-6">
          {alert.status === 'error' && <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{alert.title}</AlertTitle>
          {alert.description && <AlertDescription>{alert.description}</AlertDescription>}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : availableSubjectCodes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {availableSubjectCodes.map(code => (
            <SubjectEnrollmentCard 
              key={code}
              subjectCode={code}
              subjects={groupedSubjects[code]}
              userRegistrations={userRegistrations}
              isLoading={isLoading}
              onEnrollmentChange={handleEnrollmentChange}
            />
          ))}
        </div>
      ) : (
         <Card className="mt-6 border-dashed">
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">There are no subjects open for enrollment at this time.</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
