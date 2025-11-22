
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from 'firebase/firestore';
import type { Student } from "@/lib/types";
import { StudentClient } from "./components/client";

export default function AdminStudentsPage() {
  const firestore = useFirestore();
  
  const studentsQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('role', '==', 'student')),
    [firestore]
  );
  
  const { data: students, isLoading } = useCollection<Student>(studentsQuery);

  return (
    <>
      <PageHeader
        title={`Students (${isLoading ? '...' : students?.length ?? 0})`}
        description="Manage all student accounts in the system."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Student
        </Button>
      </PageHeader>
      
      <Card>
        <CardContent>
          <StudentClient data={students || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </>
  );
}
