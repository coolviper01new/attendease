import { PageHeader } from "@/components/page-header";
import { getStudentSubjects, mockStudents } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Clock } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const student = mockStudents[0];
const subjects = getStudentSubjects(student.id);

const QrCodeDialog = ({ studentId, subjectId }: { studentId: string, subjectId: string }) => {
    // In a real app, the qrCodeSecret would come from the registration data
    const qrCodeSecret = "supersecretkey";
    const qrData = JSON.stringify({ studentId, subjectId, qrCodeSecret });
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <QrCode className="mr-2 h-4 w-4" /> View QR Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Your Attendance QR Code</DialogTitle>
                    <DialogDescription>
                        Present this to the administrator for attendance marking. This code is unique to you and this subject.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                    <Image src={qrCodeUrl} alt="Attendance QR Code" width={250} height={250} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function StudentDashboardPage() {
  return (
    <>
      <PageHeader
        title="My Subjects"
        description="Here are the subjects you are enrolled in."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardHeader>
              <CardTitle className="font-headline">{subject.name}</CardTitle>
              <CardDescription>{subject.code}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>
                  {subject.schedule.day}, {subject.schedule.startTime} - {subject.schedule.endTime}
                </span>
              </div>
               <p className="text-sm text-muted-foreground mt-1">
                Room: {subject.schedule.room}
               </p>
            </CardContent>
            <CardFooter>
              <QrCodeDialog studentId={student.id} subjectId={subject.id} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
