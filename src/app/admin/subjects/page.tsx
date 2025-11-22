

'use client';

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SubjectClient } from "./components/client";
import { Card, CardContent } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, getDocs, query } from 'firebase/firestore';
import type { Subject } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddSubjectForm } from "./components/add-subject-form";

export default function AdminSubjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const firestore = useFirestore();
  
  const subjectsQuery = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const { data: subjects, isLoading, forceRefresh } = useCollection<Subject>(subjectsQuery);

  const handleAddNew = () => {
    setEditingSubject(null);
    setIsDialogOpen(true);
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsDialogOpen(true);
  }

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingSubject(null);
    forceRefresh();
  }
  
  const combinedSubjects = useMemo(() => {
    if (isLoading) return [];
    return subjects ?? [];
  }, [subjects, isLoading]);

  return (
    <>
      <PageHeader
        title={`Subjects (${isLoading ? '...' : subjects?.length ?? 0})`}
        description="Manage school subjects and attendance sessions."
      >
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
        </Button>
      </PageHeader>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingSubject(null);
          }
          setIsDialogOpen(isOpen);
      }}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create New Subject'}</DialogTitle>
              <DialogDescription>
                {editingSubject ? 'Update the details for this subject.' : 'Fill out the form below to add a new subject to the system.'}
              </DialogDescription>
            </DialogHeader>
            <AddSubjectForm 
                subject={editingSubject}
                onSuccess={handleSuccess}
             />
          </DialogContent>
        </Dialog>

      <Card>
        <CardContent>
          <SubjectClient data={combinedSubjects} isLoading={isLoading} onEdit={handleEdit} onRefresh={forceRefresh} />
        </CardContent>
      </Card>
    </>
  );
}
