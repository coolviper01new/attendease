
'use client';
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QrCode, StopCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { Subject, User, Student } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectAttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const firestore = useFirestore();

  const subjectDocRef = useMemoFirebase(() => doc(firestore, 'subjects', subjectId), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const studentsQuery = useMemoFirebase(() => {
    if (!subject?.blockId) return null;
    return query(collection(firestore, 'users'), where('blockId', '==', subject.blockId), where('role', '==', 'student'));
  }, [firestore, subject?.blockId]);
  const { data: registeredStudents, isLoading: areStudentsLoading } = useCollection<Student>(studentsQuery);

  if (isSubjectLoading) {
    return (
        <div className="container p-6">
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3 mb-6" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!subject) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={subject.name}
        description={`Manage attendance for ${subject.code}.`}
      >
        <Button variant="outline">
          <StopCircle className="mr-2 h-4 w-4" /> Deactivate Session
        </Button>
        <Button>
          <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>
            Mark attendance for students in this subject. Today's date: {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areStudentsLoading ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            Loading students...
                        </TableCell>
                    </TableRow>
                ) : registeredStudents && registeredStudents.length > 0 ? (
                  registeredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                            <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.firstName} {student.lastName}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.studentNumber}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Not Marked</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline">Absent</Button>
                          <Button size="sm">Present</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No students enrolled in this block.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

    