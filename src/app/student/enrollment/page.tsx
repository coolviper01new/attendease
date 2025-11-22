
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
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc } from 'firebase/firestore';
import type { Subject, Registration } from '@/lib/types';
import { groupBy } from 'lodash';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function SubjectEnrollmentCard({ 
    subjectCode, 
    subjects, 
    userRegistrations, 
    isLoading 
}: { 
    subjectCode: string;
    subjects: Subject[];
    userRegistrations: Registration[] | null;
    isLoading: boolean;
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const representativeSubject = subjects[0];
    const availableBlocks = subjects.map(s => s.block);

    const handleEnroll = async () => {
        if (!user || !selectedBlock) {
            toast({ variant: 'destructive', title: 'Selection Incomplete', description: 'Please select a block.' });
            return;
        }

        const subjectToEnroll = subjects.find(s => s.block === selectedBlock);
        if (!subjectToEnroll) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selected subject block not found.' });
            return;
        }
        
        const isAlreadyRegistered = userRegistrations?.some(reg => reg.subjectId === subjectToEnroll.id);
        if (isAlreadyRegistered) {
            toast({ variant: 'destructive', title: 'Already Registered', description: `You are already enrolled in this subject.` });
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
            toast({
                title: 'Enrollment Successful',
                description: `You have been enrolled in ${subjectToEnroll.name} (${selectedBlock}).`,
            });
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

  const subjectsQuery = useMemoFirebase(() => query(collection(firestore, 'subjects'), where('enrollmentStatus', '==', 'open')), [firestore]);
  const { data: allSubjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsQuery);
  
  const registrationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'registrations'));
  }, [firestore, user]);
  const { data: userRegistrations, isLoading: areRegsLoading } = useCollection<Registration>(registrationsQuery);

  const groupedSubjects = useMemo(() => {
    if (!allSubjects) return {};
    return groupBy(allSubjects, 'code');
  }, [allSubjects]);
  
  const availableSubjectCodes = Object.keys(groupedSubjects);
  const isLoading = isUserLoading || areSubjectsLoading || areRegsLoading;

  return (
    <>
      <PageHeader
        title="Subject Enrollment"
        description="Browse available subjects for the current semester and enroll."
      />
      
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

    