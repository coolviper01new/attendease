
'use client';
import { useMemo } from 'react';
import type { DashboardData } from "../page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DashboardProps {
    data: DashboardData | null;
    isLoading: boolean;
}

export function TacticalDashboard({ data, isLoading }: DashboardProps) {

    const atRiskStudents = useMemo(() => {
        if (!data || !data.attendance || !data.students) return [];
        const absenceCounts: { [studentId: string]: number } = {};

        data.attendance.forEach(att => {
            if (att.status === 'absent') {
                if (!absenceCounts[att.studentId]) {
                    absenceCounts[att.studentId] = 0;
                }
                absenceCounts[att.studentId]++;
            }
        });

        return Object.entries(absenceCounts)
            .map(([studentId, count]) => {
                const student = data.students.find(s => s.id === studentId);
                return {
                    student,
                    absenceCount: count
                };
            })
            .filter(item => item.student && item.absenceCount > 3) // Threshold for "at-risk"
            .sort((a, b) => b.absenceCount - a.absenceCount);
    }, [data]);
    
    const lowAttendanceSubjects = useMemo(() => {
        if (!data || !data.subjects || !data.registrations || !data.attendance) return [];
        
        return data.subjects.map(subject => {
            const subjectRegistrations = data.registrations.filter(r => r.subjectId === subject.id);
            const totalPossibleAttendances = subjectRegistrations.length * 20; // Simplified assumption for a semester
            const subjectAttendanceRecords = data.attendance.filter(a => a.subjectId === subject.id && a.status === 'present');
            
            if (totalPossibleAttendances === 0) {
                 return { ...subject, rate: 100 }; // Default to 100 if no one is enrolled
            }
            const rate = (subjectAttendanceRecords.length / totalPossibleAttendances) * 100;
            return {
                ...subject,
                rate: parseFloat(rate.toFixed(1))
            };
        })
        .filter(s => s.rate < 85) // Threshold for "low attendance"
        .sort((a,b) => a.rate - b.rate);
    }, [data]);


    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>At-Risk Students</CardTitle>
                    <CardDescription>Students with more than 3 absences across all subjects.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead className="text-center">Absences</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {atRiskStudents && atRiskStudents.length > 0 ? atRiskStudents.map(({ student, absenceCount }) => (
                                <TableRow key={student!.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{student!.firstName?.charAt(0)}{student!.lastName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div>{student!.firstName} {student!.lastName}</div>
                                                <div className="text-xs text-muted-foreground">{student!.studentNumber}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="destructive">{absenceCount}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">View Record</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                 <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">No students are currently at-risk.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Subjects with Low Attendance</CardTitle>
                    <CardDescription>Subjects with an attendance rate below 85%.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-right">Attendance Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lowAttendanceSubjects && lowAttendanceSubjects.length > 0 ? lowAttendanceSubjects.map(subject => (
                                <TableRow key={subject.id}>
                                    <TableCell>{subject.name} ({subject.block})</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="destructive" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                                            {subject.rate.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">All subjects have good attendance.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
