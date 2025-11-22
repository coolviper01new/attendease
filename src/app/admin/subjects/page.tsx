import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SubjectClient } from "./components/client";
import { mockSubjects } from "@/lib/data";

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

      <SubjectClient data={mockSubjects} />
    </>
  );
}
