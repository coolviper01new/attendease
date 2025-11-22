
'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SubjectClient } from "./components/client";
import { Card, CardContent } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import type { Subject } from "@/lib/types";

export default function AdminSubjectsPage() {
  const firestore = useFirestore();
  const subjectsQuery = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const { data: subjectsData, isLoading } = useCollection<Subject>(subjectsQuery);

  const subjects = subjectsData || [];

  return (
    <>
      <PageHeader
        title={`Subjects (${isLoading ? '...' : subjects.length})`}
        description="Manage school subjects and attendance sessions."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <SubjectClient data={subjects} isLoading={isLoading} />
        </CardContent>
      </Card>
    </>
  );
}

    