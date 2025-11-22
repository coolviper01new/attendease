import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SubjectClient } from "./components/client";
import { mockSubjects } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminSubjectsPage() {
  return (
    <>
      <PageHeader
        title={`Subjects (${mockSubjects.length})`}
        description="Manage school subjects and attendance sessions."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <SubjectClient data={mockSubjects} />
        </CardContent>
      </Card>
    </>
  );
}
