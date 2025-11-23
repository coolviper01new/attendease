
'use client';
import { useMemo } from 'react';
import type { DashboardData } from "../page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardProps {
    data: DashboardData | null;
    isLoading: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function StrategicDashboard({ data, isLoading }: DashboardProps) {

    const enrollmentByCourse = useMemo(() => {
        if (!data?.students) return [];
        const counts: { [course: string]: number } = {};
        data.students.forEach(student => {
            if (student.course) {
                if (!counts[student.course]) {
                    counts[student.course] = 0;
                }
                counts[student.course]++;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);
    
     const attendanceByYearLevel = useMemo(() => {
        if (!data || !data.subjects || !data.registrations || !data.attendance) return [];
        
        const yearLevels = ['1', '2', '3', '4'];
        
        return yearLevels.map(year => {
            // Find all subjects for this year level
            const subjectsForYear = data.subjects.filter(s => s.yearLevel === year);
            const subjectIds = new Set(subjectsForYear.map(s => s.id));
            
            // Get all attendance records for those subjects
            const yearAttendance = data.attendance.filter(a => subjectIds.has(a.subjectId));
            
            // Get registrations for those subjects
            const yearRegistrations = data.registrations.filter(r => subjectIds.has(r.subjectId));
            
            const presentCount = yearAttendance.filter(a => a.status === 'present').length;
            const totalPossibleAttendances = yearRegistrations.length * 20; // Simplified assumption
            
            if (totalPossibleAttendances === 0) {
                 return { name: `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`, 'Attendance Rate': 0 };
            }
            
            const rate = (presentCount / totalPossibleAttendances) * 100;
            return {
                name: `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`,
                'Attendance Rate': parseFloat(rate.toFixed(1))
            };
        });
    }, [data]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>Enrollment by Course</CardTitle>
                    <CardDescription>Distribution of students across different courses.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={enrollmentByCourse}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {enrollmentByCourse.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Tooltip contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}/>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Attendance by Year Level</CardTitle>
                    <CardDescription>Comparing attendance rates across year levels.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={attendanceByYearLevel}>
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                            <Tooltip contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}/>
                            <Bar dataKey="Attendance Rate" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
