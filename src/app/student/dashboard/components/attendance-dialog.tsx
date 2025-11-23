'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, collection } from 'firebase/firestore';
import type { Subject, Student, Attendance } from '@/lib/types';
import { ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceDialogProps {
  subject: Subject;
  student: Student | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceDialog({
  subject,
  student,
  isOpen,
  onOpenChange,
}: AttendanceDialogProps) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(() => {
    if (!student || !isOpen) return null;
    // This query fetches all attendance sessions for the subject, then we can look up the student's record.
    // It's more complex but required by the security rules for students.
    // A more direct approach would be a collectionGroup query on attendance, filtered by studentId and subjectId.
    return query(
        collectionGroup(firestore, 'attendance'),
        where('studentId', '==', student.id),
        where('subjectId', '==', subject.id),
        orderBy('timestamp', 'desc')
    );
  }, [firestore, student, subject.id, isOpen]);

  const { data: subjectAttendanceRecords, isLoading } = useCollection<Attendance>(attendanceQuery);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ListChecks className="mr-2 h-4 w-4" /> My Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>My Attendance: {subject.name}</DialogTitle>
          <DialogDescription>
            Your attendance history for this subject.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center"
                  >
                    Loading attendance...
                  </TableCell>
                </TableRow>
              ) : subjectAttendanceRecords && subjectAttendanceRecords.length > 0 ? (
                subjectAttendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.timestamp ? record.timestamp.toDate().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                     {record.status ? (
                        <Badge
                          variant={
                            record.status === 'present'
                              ? 'default'
                              : record.status === 'absent'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={cn(
                            'capitalize',
                            record.status === 'present' &&
                              'bg-green-600/10 text-green-700 border-green-600/20 hover:bg-green-600/20',
                            record.status === 'absent' &&
                              'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
                            record.status === 'late' &&
                              'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20'
                          )}
                        >
                          {record.status}
                        </Badge>
                      ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center"
                  >
                    No attendance records found for this subject.
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
