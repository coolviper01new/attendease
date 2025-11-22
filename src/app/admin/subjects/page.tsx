
'use client';

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SubjectClient } from "./components/client";
import { Card, CardContent } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import type { Subject, SchoolYear, YearLevel } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddSubjectForm } from "./components/add-subject-form";

export default function AdminSubjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const firestore = useFirestore();
  
  const subjectsQuery = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const { data: subjectsData, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const schoolYearsQuery = useMemoFirebase(() => collection(firestore, 'schoolYears'), [firestore]);
  const { data: schoolYearsData, isLoading: schoolYearsLoading } = useCollection<SchoolYear>(schoolYearsQuery);

  const yearLevelsQuery = useMemoFirebase(() => collection(firestore, 'yearLevels'), [firestore]);
  const { data: yearLevelsData, isLoading: yearLevelsLoading } = useCollection<YearLevel>(yearLevelsQuery);

  const isLoading = subjectsLoading || schoolYearsLoading || yearLevelsLoading;

  const subjects = useMemo(() => {
    if (!subjectsData || !schoolYearsData || !yearLevelsData) {
      return [];
    }

    const schoolYearMap = new Map(schoolYearsData.map(sy => [sy.id, sy.name]));
    const yearLevelMap = new Map(yearLevelsData.map(yl => [yl.id, yl.name]));

    return subjectsData.map(subject => ({
      ...subject,
      schoolYearName: schoolYearMap.get(subject.schoolYearId) ?? 'N/A',
      yearLevelName: yearLevelMap.get(subject.yearLevelId) ?? 'N/A',
    }));
  }, [subjectsData, schoolYearsData, yearLevelsData]);

  return (
    <>
      <PageHeader
        title={`Subjects (${isLoading ? '...' : subjects.length})`}
        description="Manage school subjects and attendance sessions."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
              <DialogDescription>
                Fill out the form below to add a new subject to the system.
              </DialogDescription>
            </DialogHeader>
            <AddSubjectForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent>
          <SubjectClient data={subjects} isLoading={isLoading} />
        </CardContent>
      </Card>
    </>
  );
}
