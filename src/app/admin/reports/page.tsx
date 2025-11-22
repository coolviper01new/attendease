
'use client';
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AttendanceReportClient } from "./components/attendance-report-client";
import { WarningsReportClient } from "./components/warnings-report-client";
import { Card, CardContent } from "@/components/ui/card";
import { useFirestore } from "@/firebase";
import { collection, collectionGroup, getDocs, query } from "firebase/firestore";
import { useMemo, useEffect, useState } from "react";
import type { Attendance, Subject, User, Warning } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

export default function AdminReportsPage() {
    const firestore = useFirestore();
    const [formattedAttendance, setFormattedAttendance] = useState<any[]>([]);
    const [formattedWarnings, setFormattedWarnings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            setIsLoading(true);
            
            try {
                const studentsQuery = query(collection(firestore, 'users'));
                const subjectsQuery = query(collection(firestore, 'subjects'));
                const attendanceQuery = query(collectionGroup(firestore, 'attendance'));
                const warningsQuery = query(collectionGroup(firestore, 'warnings'));

                const handlePermissionError = (operation: 'list', path: string) => {
                    const permissionError = new FirestorePermissionError({ path, operation });
                    errorEmitter.emit('permission-error', permissionError);
                };

                const [studentsSnapshot, subjectsSnapshot, attendanceSnapshot, warningsSnapshot] = await Promise.all([
                    getDocs(studentsQuery).catch(err => { handlePermissionError('list', 'users'); throw err; }),
                    getDocs(subjectsQuery).catch(err => { handlePermissionError('list', 'subjects'); throw err; }),
                    getDocs(attendanceQuery).catch(err => { handlePermissionError('list', 'attendance'); throw err; }),
                    getDocs(warningsQuery).catch(err => { handlePermissionError('list', 'warnings'); throw err; })
                ]);
                
                if (signal.aborted) return;

                const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (User & {id: string, name: string})[];
                const subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Subject & {id: string})[];
                const attendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Attendance & {id: string})[];
                const warnings = warningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Warning & {id: string})[];

                // Format attendance data
                const fa = attendance.map(att => {
                    const student = students.find(s => s.id === att.studentId);
                    const subject = subjects.find(s => s.id === att.subjectId);
                    return {
                        ...att,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
                        subjectName: subject?.name || 'N/A'
                    };
                });
                
                if (!signal.aborted) {
                    setFormattedAttendance(fa);
                }
                
                // Format warnings data
                const fw = warnings.map(warn => {
                    const student = students.find(s => s.id === warn.studentId);
                    const subject = subjects.find(s => s.id === warn.subjectId);
                    return {
                        ...warn,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
                        subjectName: subject?.name || 'N/A'
                    };
                });
                
                if (!signal.aborted) {
                    setFormattedWarnings(fw);
                }

            } catch (error) {
                if ((error as any).name !== 'AbortError' && (error as any).name !== 'FirebaseError') {
                    console.error("Failed to fetch reports data:", error);
                }
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [firestore]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="View and export attendance records and warnings."
      >
        <Button disabled>
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
                    <AttendanceReportClient data={formattedAttendance} isLoading={isLoading} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="warnings">
            <Card>
                <CardContent>
                    <WarningsReportClient data={formattedWarnings} isLoading={isLoading} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </>
  );
}
