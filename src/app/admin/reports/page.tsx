import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { mockAttendance, mockStudents, mockSubjects, mockWarnings } from "@/lib/data";
import { AttendanceReportClient } from "./components/attendance-report-client";
import { WarningsReportClient } from "./components/warnings-report-client";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminReportsPage() {

    const formattedAttendance = mockAttendance.map(att => {
        const student = mockStudents.find(s => s.id === att.studentId);
        const subject = mockSubjects.find(s => s.id === att.subjectId);
        return {
            ...att,
            studentName: student?.name || 'N/A',
            subjectName: subject?.name || 'N/A'
        }
    });

    const formattedWarnings = mockWarnings.map(warn => {
        const student = mockStudents.find(s => s.id === warn.studentId);
        const subject = mockSubjects.find(s => s.id === warn.subjectId);
        return {
            ...warn,
            studentName: student?.name || 'N/A',
            subjectName: subject?.name || 'N/A'
        }
    });

  return (
    <>
      <PageHeader
        title="Reports"
        description="View and export attendance records and warnings."
      >
        <Button>
          <Download className="mr-2 h-4 w-4" /> Download All
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
          <TabsTrigger value="warnings">Absence Warnings</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
            <Card>
                <CardContent>
                    <AttendanceReportClient data={formattedAttendance} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="warnings">
            <Card>
                <CardContent>
                    <WarningsReportClient data={formattedWarnings} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </>
  );
}
