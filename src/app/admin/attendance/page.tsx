
'use client';
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, CalendarIcon } from "lucide-react";
import { AttendanceReportClient } from "./components/attendance-report-client";
import { WarningsReportClient } from "./components/warnings-report-client";
import { Card, CardContent } from "@/components/ui/card";
import { useFirestore } from "@/firebase";
import { collection, collectionGroup, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import type { Attendance, Subject, User, Warning } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminAttendancePage() {
    const firestore = useFirestore();
    const [allAttendance, setAllAttendance] = useState<any[]>([]);
    const [allWarnings, setAllWarnings] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<(Subject & {id: string})[]>([]);
    const [allStudents, setAllStudents] = useState<(User & {id: string, name: string})[]>([]);
    
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    // Initial data fetch for students, subjects, and warnings
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchInitialData = async () => {
            setIsInitialLoading(true);
            
            try {
                const studentsQuery = query(collection(firestore, 'users'));
                const subjectsQuery = query(collection(firestore, 'subjects'));
                const warningsQuery = query(collectionGroup(firestore, 'warnings'));

                const handlePermissionError = (operation: 'list', path: string) => {
                    const permissionError = new FirestorePermissionError({ path, operation });
                    errorEmitter.emit('permission-error', permissionError);
                };

                const [studentsSnapshot, subjectsSnapshot, warningsSnapshot] = await Promise.all([
                    getDocs(studentsQuery).catch(err => { handlePermissionError('list', 'users'); throw err; }),
                    getDocs(subjectsQuery).catch(err => { handlePermissionError('list', 'subjects'); throw err; }),
                    getDocs(warningsQuery).catch(err => { handlePermissionError('list', 'warnings'); throw err; })
                ]);

                if (signal.aborted) return;

                const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (User & {id: string, name: string})[];
                const subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Subject & {id: string})[];
                
                if(!signal.aborted) {
                    setAllStudents(students.map(s => ({...s, name: `${s.firstName} ${s.lastName}`})));
                    setAllSubjects(subjects);
                }

                const warnings = warningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Warning & {id: string})[];
                
                const fw = warnings.map(warn => {
                    const student = students.find(s => s.id === warn.studentId);
                    const subject = subjects.find(s => s.id === warn.subjectId);
                    return {
                        ...warn,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
                        subjectName: subject?.name || 'N/A'
                    };
                });
                
                if (!signal.aborted) setAllWarnings(fw);

            } catch (error) {
                if ((error as any).name !== 'AbortError' && (error as any).code?.startsWith('permission-denied')) {
                     // Error is already emitted
                } else if ((error as any).name !== 'AbortError') {
                    console.error("Failed to fetch initial reports data:", error);
                }
            } finally {
                if (!signal.aborted) setIsInitialLoading(false);
            }
        };

        fetchInitialData();

        return () => controller.abort();
    }, [firestore]);

    // Fetch attendance data only when filters are applied
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchAttendanceData = async () => {
            if (!selectedSubjectId || !selectedDate) {
                setAllAttendance([]); // Clear attendance if filters are not set
                return;
            };

            setIsAttendanceLoading(true);
            setAllAttendance([]);
            
            try {
                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                const attendanceQuery = query(
                    collectionGroup(firestore, 'attendance'), 
                    where('subjectId', '==', selectedSubjectId),
                    where('date', '>=', `${formattedDate}T00:00:00`),
                    where('date', '<=', `${formattedDate}T23:59:59`)
                );
                
                const attendanceSnapshot = await getDocs(attendanceQuery).catch(err => {
                    const permissionError = new FirestorePermissionError({ path: `attendance (subjectId: ${selectedSubjectId}, date: ${formattedDate})`, operation: 'list' });
                    errorEmitter.emit('permission-error', permissionError);
                    throw err;
                });

                if (signal.aborted) return;
                
                const attendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Attendance & {id: string})[];

                const fa = attendance.map(att => {
                    const student = allStudents.find(s => s.id === att.studentId);
                    const subject = allSubjects.find(s => s.id === att.subjectId);
                    return {
                        ...att,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
                        subjectName: subject?.name || 'N/A',
                        date: att.timestamp?.toDate().toISOString() || new Date().toISOString()
                    };
                });
                
                if (!signal.aborted) setAllAttendance(fa);

            } catch (error) {
                if ((error as any).name !== 'AbortError' && !(error as any).code?.startsWith('permission-denied')) {
                    console.error("Failed to fetch attendance data:", error);
                }
            } finally {
                if (!signal.aborted) setIsAttendanceLoading(false);
            }
        };
        
        fetchAttendanceData();

        return () => controller.abort();
    }, [selectedSubjectId, selectedDate, firestore, allStudents, allSubjects]);
    
    const filteredWarnings = useMemo(() => {
         if (!selectedSubjectId) {
            return allWarnings;
         }
         return allWarnings.filter(warn => warn.subjectId === selectedSubjectId);
    }, [allWarnings, selectedSubjectId]);

    const isLoading = isInitialLoading || isAttendanceLoading;

  return (
    <>
      <PageHeader
        title="Attendance & Reports"
        description="View and export attendance records and warnings."
      >
        <Button disabled>
          <Download className="mr-2 h-4 w-4" /> Download All
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="attendance">
        <div className="flex justify-between items-center">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
            <TabsTrigger value="warnings">Absence Warnings</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
                <Select value={selectedSubjectId || 'all'} onValueChange={(value) => setSelectedSubjectId(value === 'all' ? null : value)}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Filter by subject..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {allSubjects.map(subject => (
                            <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.block})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date...</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
                        <Button variant="ghost" onClick={() => setSelectedDate(undefined)}>Clear</Button>
                        <div className="rounded-md border">
                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        <TabsContent value="attendance" className="mt-4">
            <Card>
                <CardContent>
                    <AttendanceReportClient data={allAttendance} isLoading={isLoading} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="warnings" className="mt-4">
            <Card>
                <CardContent>
                    <WarningsReportClient data={filteredWarnings} isLoading={isInitialLoading} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

    