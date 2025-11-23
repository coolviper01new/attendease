
'use client';
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Book, Clock, AlertTriangle, ListChecks } from "lucide-react";
import type { DashboardData } from "../page";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";

interface DashboardProps {
    data: DashboardData | null;
    isLoading: boolean;
}

export function InformationalDashboard({ data, isLoading }: DashboardProps) {

    const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);

    const todaysSubjects = useMemo(() => {
        if (!data?.subjects) return [];
        return data.subjects
            .filter(subject => 
                subject.lectureSchedules.some(s => s.day === today) || 
                subject.labSchedules?.some(s => s.day === today)
            )
            .sort((a, b) => {
                const aTime = a.lectureSchedules.find(s => s.day === today)?.startTime || '23:59';
                const bTime = b.lectureSchedules.find(s => s.day === today)?.startTime || '23:59';
                return aTime.localeCompare(bTime);
            });
    }, [data?.subjects, today]);
    
    const todaysWarnings = useMemo(() => {
        if (!data?.warnings) return 0;
        const todayStr = new Date().toISOString().split('T')[0];
        return data.warnings.filter(w => w.date.startsWith(todayStr)).length;
    }, [data?.warnings]);

    const stats = {
        totalStudents: data?.students.length ?? 0,
        totalSubjects: data?.subjects.length ?? 0,
        activeSessions: data?.activeSessions.length ?? 0,
        todaysWarnings: todaysWarnings,
    }

    if (isLoading) {
        return (
            <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </>
        )
    }

    return (
        <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Students" value={stats.totalStudents} icon={Users} description="All enrolled students" />
                <StatCard title="Total Subjects" value={stats.totalSubjects} icon={Book} description="Across all courses" />
                <StatCard title="Active Sessions" value={stats.activeSessions} icon={Clock} description="Live attendance marking" />
                <StatCard title="Warnings Today" value={stats.todaysWarnings} icon={AlertTriangle} description="New absence warnings issued" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                        <CardDescription>Your upcoming classes for {today}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Room</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {todaysSubjects.length > 0 ? todaysSubjects.flatMap(subject => 
                                    subject.lectureSchedules
                                        .filter(s => s.day === today)
                                        .map((schedule, i) => (
                                            <TableRow key={`${subject.id}-lec-${i}`}>
                                                <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
                                                <TableCell>{subject.name} ({subject.block})</TableCell>
                                                <TableCell>{schedule.room}</TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No classes scheduled for today.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Live Attendance Sessions</CardTitle>
                        <CardDescription>Classes currently open for attendance marking.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Start Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {data && data.activeSessions.length > 0 ? data.activeSessions.map(session => {
                                   const subject = data.subjects.find(s => s.id === session.subjectId);
                                   return (
                                        <TableRow key={session.id}>
                                           <TableCell>{subject ? `${subject.name} (${subject.block})` : 'Unknown Subject'}</TableCell>
                                           <TableCell>{session.startTime?.toDate().toLocaleTimeString() || 'N/A'}</TableCell>
                                       </TableRow>
                                   )
                               }) : (
                                   <TableRow>
                                       <TableCell colSpan={2} className="text-center h-24">No active attendance sessions.</TableCell>
                                   </TableRow>
                               )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
