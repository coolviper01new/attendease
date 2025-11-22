
'use client';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { CheckCircle2, XCircle, Clock, BarChartHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, collectionGroup } from "firebase/firestore";
import type { Attendance, Subject } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function StudentAttendancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const attendanceQuery = useMemoFirebase(() => {
        if (!user) return null;
        // This query is expensive. It scans all attendance records.
        // A better structure would be /users/{userId}/attendance
        return query(collectionGroup(firestore, 'attendance'), where('studentId', '==', user.uid));
    }, [user, firestore]);
    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

    const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(useMemo(() => collection(firestore, 'subjects'), [firestore]));

    const isLoading = isUserLoading || isAttendanceLoading || areSubjectsLoading;

    const presentCount = attendanceRecords?.filter(r => r.status === 'present').length ?? 0;
    const absentCount = attendanceRecords?.filter(r => r.status === 'absent').length ?? 0;
    const lateCount = attendanceRecords?.filter(r => r.status === 'late').length ?? 0;
    const totalRecords = attendanceRecords?.length ?? 0;

    return (
        <>
            <PageHeader
                title="My Attendance"
                description="Your attendance summary and history."
            />

            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <StatCard title="Present" value={isLoading ? '...' : presentCount} icon={CheckCircle2} description={totalRecords > 0 ? `${((presentCount / totalRecords) * 100).toFixed(0)}% attendance rate` : 'No records yet'} />
                <StatCard title="Absent" value={isLoading ? '...' : absentCount} icon={XCircle} description={totalRecords > 0 ? `${((absentCount / totalRecords) * 100).toFixed(0)}% absence rate` : 'No records yet'} />
                <StatCard title="Late" value={isLoading ? '...' : lateCount} icon={Clock} description={totalRecords > 0 ? `${((lateCount / totalRecords) * 100).toFixed(0)}% late rate` : 'No records yet'} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-xl">
                        <BarChartHorizontal className="h-5 w-5" />
                        Attendance History
                    </CardTitle>
                    <CardDescription>A log of all your attendance records for the current semester.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            Loading attendance history...
                                        </TableCell>
                                    </TableRow>
                                ) : totalRecords > 0 ? (
                                    attendanceRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
                                        const subject = subjects?.find(s => s.id === record.subjectId);
                                        return (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">{new Date(record.date).toLocaleDateString()}</TableCell>
                                                <TableCell>{subject?.name || 'N/A'}</TableCell>
                                                <TableCell className="text-center">
                                                     <Badge 
                                                        variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'} 
                                                        className={cn(
                                                            'capitalize',
                                                            record.status === 'present' && 'bg-green-600/10 text-green-700 border-green-600/20 hover:bg-green-600/20',
                                                            record.status === 'absent' && 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
                                                            record.status === 'late' && 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20'
                                                            )}
                                                     >
                                                        {record.status}
                                                     </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No attendance records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

    