'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Subject, Registration } from '@/lib/types';
import { groupBy } from 'lodash';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function EnrollmentPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjectsQuery = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
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
  
  const availableSubjects = Object.keys(groupedSubjects);

  const blocksForSelectedSubject = useMemo(() => {
    if (!selectedSubjectCode || !groupedSubjects[selectedSubjectCode]) return [];
    return groupedSubjects[selectedSubjectCode].map(s => s.block);
  }, [selectedSubjectCode, groupedSubjects]);
  
  const handleEnroll = async () => {
    if (!user || !selectedSubjectCode || !selectedBlock) {
      toast({
        variant: 'destructive',
        title: 'Selection Incomplete',
        description: 'Please select both a subject and a block.',
      });
      return;
    }

    const subjectToEnroll = groupedSubjects[selectedSubjectCode].find(s => s.block === selectedBlock);
    if (!subjectToEnroll) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected subject block not found.' });
        return;
    }
    
    // Check if already registered
    const isAlreadyRegistered = userRegistrations?.some(reg => reg.subjectId === subjectToEnroll.id);
    if (isAlreadyRegistered) {
        toast({
            variant: 'destructive',
            title: 'Already Registered',
            description: `You are already enrolled in ${subjectToEnroll.name} (${subjectToEnroll.block}).`
        });
        return;
    }

    setIsSubmitting(true);
    try {
      const registrationData = {
        studentId: user.uid,
        subjectId: subjectToEnroll.id,
        block: selectedBlock,
        registrationDate: serverTimestamp(),
      };
      
      const registrationRef = collection(firestore, 'users', user.uid, 'registrations');
      await addDoc(registrationRef, registrationData);

      toast({
        title: 'Enrollment Successful',
        description: `You have been enrolled in ${subjectToEnroll.name} (${selectedBlock}).`,
      });
      setSelectedBlock(null);
      setSelectedSubjectCode(null);
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        variant: 'destructive',
        title: 'Enrollment Failed',
        description: 'There was a problem enrolling you in the subject. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || areSubjectsLoading || areRegsLoading;

  return (
    <>
      <PageHeader
        title="Subject Enrollment"
        description="Select a subject and block to enroll in."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Enroll in a New Subject</CardTitle>
          <CardDescription>
            Choose a subject from the list and then select the block you wish to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Select
              onValueChange={(value) => {
                setSelectedSubjectCode(value);
                setSelectedBlock(null); // Reset block selection when subject changes
              }}
              value={selectedSubjectCode || ''}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject..." />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((code) => (
                  <SelectItem key={code} value={code}>
                    {groupedSubjects[code][0].name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSubjectCode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Block</label>
              <Select
                onValueChange={setSelectedBlock}
                value={selectedBlock || ''}
                disabled={isLoading || !selectedSubjectCode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a block..." />
                </SelectTrigger>
                <SelectContent>
                  {blocksForSelectedSubject.map((block) => (
                    <SelectItem key={block} value={block}>
                      {block}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <Button onClick={handleEnroll} disabled={isLoading || isSubmitting || !selectedSubjectCode || !selectedBlock}>
            {isSubmitting ? 'Enrolling...' : 'Enroll Now'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
