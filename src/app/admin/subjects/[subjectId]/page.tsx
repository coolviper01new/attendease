
'use client';
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QrCode, StopCircle, Clock } from "lucide-react";
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
import { doc, collection, query, where, getDocs } from "firebase/firestore";
import type { Subject, User, Student, Registration } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export default function SubjectAttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const firestore = useFirestore();

  const subjectDocRef = useMemoFirebase(() => doc(firestore, 'subjects', subjectId), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const registrationsQuery = useMemoFirebase(() => {
    if (!subjectId) return null;
    return query(collectionGroup(firestore, 'registrations'), where('subjectId', '==', subjectId));
  }, [firestore, subjectId]);
  
  const { data: registrations, isLoading: areRegistrationsLoading } = useCollection<Registration>(registrationsQuery);

  const [registeredStudents, setRegisteredStudents] = useState<(Student & { id: string })[]>([]);
  const [areStudentsLoading, setAreStudentsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStudents = async () => {
      if (registrations && registrations.length > 0) {
        if (isMounted) setAreStudentsLoading(true);
        const studentIds = registrations.map(reg => reg.studentId);
        
        const studentChunks: string[][] = [];
        for (let i = 0; i < studentIds.length; i += 10) {
            studentChunks.push(studentIds.slice(i, i + 10));
        }
        
        const studentPromises = studentChunks.map(chunk => 
            getDocs(query(collection(firestore, 'users'), where('__name__', 'in', chunk)))
        );

        const studentSnapshots = await Promise.all(studentPromises);
        if (!isMounted) return;

        const students = studentSnapshots.flatMap(snapshot => 
            snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student & {id: string}))
        );

        if (isMounted) {
          setRegisteredStudents(students);
          setAreStudentsLoading(false);
        }

      } else if (!areRegistrationsLoading) {
        if (isMounted) {
          setRegisteredStudents([]);
          setAreStudentsLoading(false);
        }
      }
    };
    fetchStudents();
    
    return () => {
      isMounted = false;
    };
  }, [registrations, areRegistrationsLoading, firestore]);
  

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
        description={`Manage attendance for ${subject.code} (${subject.block}).`}
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
                {areStudentsLoading || areRegistrationsLoading ? (
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
                            <AvatarImage src={student.avatarUrl} />
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
                            No students enrolled in this subject.
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
