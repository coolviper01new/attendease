
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from 'firebase/firestore';
import type { Admin } from "@/lib/types";
import { FacultyClient } from "./components/client";

export default function AdminFacultyPage() {
  const firestore = useFirestore();
  
  const facultyQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('role', '==', 'admin')),
    [firestore]
  );
  
  const { data: faculty, isLoading } = useCollection<Admin>(facultyQuery);

  return (
    <>
      <PageHeader
        title={`Faculty (${isLoading ? '...' : faculty?.length ?? 0})`}
        description="Manage all faculty accounts in the system."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Faculty
        </Button>
      </PageHeader>
      
      <Card>
        <CardContent>
          <FacultyClient data={faculty || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </>
  );
}
