
'use client';
import { useMemo } from 'react';
import type { DashboardData } from "../page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line, CartesianGrid } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { eachDayOfInterval, format, subDays } from 'date-fns';

interface DashboardProps {
    data: DashboardData | null;
    isLoading: boolean;
}

export function AnalyticalDashboard({ data, isLoading }: DashboardProps) {

    const attendanceTrendData = useMemo(() => {
        if (!data?.attendance) return [];
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

        const attendanceByDate = dateRange.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const totalForDay = data.attendance.filter(a => a.timestamp && format(a.timestamp.toDate(), 'yyyy-MM-dd') === dateStr);
            const presentCount = totalForDay.filter(a => a.status === 'present').length;
            
            // Note: This is a simplified calculation. For accuracy, we'd need to know how many students were *supposed* to be present.
            // For now, we'll base the rate on how many attendance records were created for that day.
            const totalRecordsForDay = totalForDay.length;
            const rate = totalRecordsForDay > 0 ? (presentCount / totalRecordsForDay) * 100 : 0;
            
            return {
                date: format(date, 'MMM d'),
                'Attendance Rate': parseFloat(rate.toFixed(1))
            };
        });
        return attendanceByDate;
    }, [data?.attendance]);
    
    const absenceByDayData = useMemo(() => {
        if (!data?.attendance) return [];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const absenceCounts = days.map(day => ({ day, Absences: 0 }));

        data.attendance.forEach(record => {
            if (record.status === 'absent' && record.timestamp) {
                const dayIndex = record.timestamp.toDate().getDay();
                absenceCounts[dayIndex].Absences++;
            }
        });
        
        // Return only weekdays
        return absenceCounts.slice(1, 6);
    }, [data?.attendance]);
    
     const subjectPerformanceData = useMemo(() => {
        if (!data?.subjects || !data.registrations || !data.attendance) return [];
        
        return data.subjects.map(subject => {
            const subjectRegistrations = data.registrations?.filter(r => r.subjectId === subject.id) || [];
            // A simplified assumption: e.g., 20 sessions per subject in a semester.
            // A more accurate approach would count the actual number of sessions held.
            const totalPossibleAttendances = subjectRegistrations.length * 20; 
            const subjectAttendanceRecords = data.attendance?.filter(a => a.subjectId === subject.id && a.status === 'present') || [];
            
            if (totalPossibleAttendances === 0) {
                 return { name: `${subject.name} (${subject.block})`, rate: 0 };
            }
            const rate = (subjectAttendanceRecords.length / totalPossibleAttendances) * 100;
            return {
                name: `${subject.name} (${subject.block})`,
                rate: parseFloat(rate.toFixed(1))
            };
        }).sort((a,b) => a.rate - b.rate); // Sort from worst to best
    }, [data?.subjects, data?.registrations, data?.attendance]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
                <Skeleton className="h-96 lg:col-span-2" />
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Attendance Trend (Last 30 Days)</CardTitle>
                    <CardDescription>Overall student attendance rate percentage.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceTrendData}>
                             <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} unit="%" />
                            <Tooltip contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}/>
                            <Line type="monotone" dataKey="Attendance Rate" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Absences by Day</CardTitle>
                    <CardDescription>Total absences recorded for each day of the week.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={absenceByDayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} allowDecimals={false} />
                            <Tooltip contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}/>
                            <Bar dataKey="Absences" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                    <CardDescription>Attendance rates by subject, sorted from lowest to highest.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-right">Attendance Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjectPerformanceData && subjectPerformanceData.length > 0 ? subjectPerformanceData.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className={cn(
                                            item.rate < 70 && "text-red-500 border-red-500/50",
                                            item.rate >= 70 && item.rate < 85 && "text-yellow-500 border-yellow-500/50",
                                            item.rate >= 85 && "text-green-500 border-green-500/50"
                                        )}>
                                            {item.rate.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">No attendance data to analyze.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
