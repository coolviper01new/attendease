'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, collectionGroup, getDocs } from 'firebase/firestore';
import type { Subject, Student, Attendance, Registration, AttendanceSession } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface AttendanceListDialogProps {
  subject: Subject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CombinedAttendanceInfo = {
    student: Student & { id: string };
    status: 'present' | 'absent';
    timestamp?: Date;
}

export function AttendanceListDialog({
  subject,
  open,
  onOpenChange,
}: AttendanceListDialogProps) {
  const firestore = useFirestore();
  const [combinedList, setCombinedList] = useState<CombinedAttendanceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Get the active session for the subject
  const activeSessionQuery = useMemoFirebase(
    () => open ? query(
        collection(firestore, 'subjects', subject.id, 'attendanceSessions'),
        where('isActive', '==', true),
        orderBy('startTime', 'desc'),
    ) : null,
    [firestore, subject.id, open]
  );
  const { data: activeSessions, isLoading: isSessionLoading } = useCollection<AttendanceSession>(activeSessionQuery);
  const activeSession = activeSessions?.[0];

  // 2. Get the attendance records for that session
  const attendanceQuery = useMemoFirebase(
      () => activeSession ? query(collection(firestore, `subjects/${subject.id}/attendanceSessions/${activeSession.id}/attendance`)) : null,
      [firestore, subject.id, activeSession]
  );
  const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

  useEffect(() => {
    if (!open) {
        setCombinedList([]); // Reset when dialog closes
        return;
    };
    
    const fetchAllData = async () => {
        setIsLoading(true);

        try {
            // 3. Get all students registered for this subject
            const registrationsQuery = query(collectionGroup(firestore, 'registrations'), where('subjectId', '==', subject.id));
            const registrationsSnapshot = await getDocs(registrationsQuery);
            const studentIds = registrationsSnapshot.docs.map(doc => (doc.data() as Registration).studentId);

            if (studentIds.length > 0) {
                const studentsQuery = query(collection(firestore, 'users'), where('__name__', 'in', studentIds));
                const studentsSnapshot = await getDocs(studentsQuery);
                const enrolledStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student & { id: string }));

                // 4. Combine the lists
                const presentStudentIds = new Set(attendanceRecords?.map(rec => rec.studentId));
                
                const list: CombinedAttendanceInfo[] = enrolledStudents.map(student => {
                    const attendanceRecord = attendanceRecords?.find(rec => rec.studentId === student.id);
                    return {
                        student: student,
                        status: presentStudentIds.has(student.id) ? 'present' : 'absent',
                        timestamp: attendanceRecord?.timestamp?.toDate(),
                    };
                });
                
                // Sort by status (absent first) then by name
                list.sort((a, b) => {
                    if (a.status === 'absent' && b.status === 'present') return -1;
                    if (a.status === 'present' && b.status === 'absent') return 1;
                    return a.student.firstName.localeCompare(b.student.firstName);
                });

                setCombinedList(list);
            } else {
                setCombinedList([]);
            }
        } catch(e) {
            const error = e as any;
             if (error?.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `registrations`,
                    operation: 'list',
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                console.error("An unexpected error occurred in AttendanceListDialog:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    // Only run if we have the session info and attendance has loaded
    if (open && !isSessionLoading && !isAttendanceLoading) {
        fetchAllData();
    }

  }, [open, subject.id, firestore, activeSession, attendanceRecords, isSessionLoading, isAttendanceLoading]);


  const totalLoading = isLoading || isSessionLoading || isAttendanceLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attendance List: {subject.name}</DialogTitle>
          <DialogDescription>
            Showing attendance for the current session.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student Number</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Time In</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totalLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={4}>
                             <Skeleton className="h-8 w-full" />
                        </TableCell>
                    </TableRow>
                ))
              ) : combinedList.length > 0 ? (
                combinedList.map((record) => (
                  <TableRow key={record.student.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={record.student.avatarUrl} />
                                <AvatarFallback>{record.student.firstName?.charAt(0)}{record.student.lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>{record.student.firstName} {record.student.lastName}</div>
                        </div>
                    </TableCell>
                    <TableCell>{record.student.studentNumber}</TableCell>
                    <TableCell className="text-center">
                        <Badge
                          variant={record.status === 'present' ? 'default' : 'destructive'}
                          className={cn(
                            'capitalize',
                            record.status === 'present' && 'bg-green-600/10 text-green-700 border-green-600/20 hover:bg-green-600/20',
                            record.status === 'absent' && 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                          )}
                        >
                          {record.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {record.timestamp ? record.timestamp.toLocaleTimeString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {activeSession ? 'No students are enrolled in this subject.' : 'No active attendance session found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
