
'use client';
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { Users, BookCheck, TrendingUp, TrendingDown, Book, UserCheck } from "lucide-react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, LineChart } from "recharts";
import { collection } from 'firebase/firestore';
import { useMemo } from "react";

export default function AdminDashboardPage() {
    const firestore = useFirestore();
    const { data: students, isLoading: studentsLoading } = useCollection(useMemoFirebase(() => collection(firestore, 'users'), [firestore]));
    const { data: subjects, isLoading: subjectsLoading } = useCollection(useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]));
    
    const totalStudents = students?.length ?? 0;
    const totalSubjects = subjects?.length ?? 0;
    
    const salesData = [
        { name: 'Jan', sales: 0 },
        { name: 'Feb', sales: 0 },
        { name: 'Mar', sales: 0 },
        { name: 'Apr', sales: 0 },
        { name: 'May', sales: 0 },
        { name: 'Jun', sales: 0 },
    ];

    const attendanceByDay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Present: 0,
            Absent: 0
        };
    }).reverse();


    return (
        <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-normal">Total Students</CardTitle>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold">{studentsLoading ? '...' : totalStudents}</p>
                            <span className="text-sm text-green-400 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> +0%</span>
                        </div>
                        <CardDescription className="text-xs">Current School Year</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src="https://picsum.photos/seed/deco1/100/120" alt="decoration" width={100} height={120} className="absolute bottom-0 right-4" />
                    </CardContent>
                </Card>
                 <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-normal">Total Subjects</CardTitle>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold">{subjectsLoading ? '...' : totalSubjects}</p>
                            <span className="text-sm text-red-400 flex items-center gap-1"><TrendingDown className="h-4 w-4" /> -0%</span>
                        </div>
                        <CardDescription className="text-xs">Current Semester</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src="https://picsum.photos/seed/deco2/100/120" alt="decoration" width={100} height={120} className="absolute bottom-0 right-4" />
                    </CardContent>
                </Card>
                 <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-normal">Summary</CardTitle>
                        <CardDescription>Overview of key metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-primary/10 rounded-md">
                               <Users className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-lg font-semibold">{totalStudents}</p>
                            <p className="text-xs text-muted-foreground">Students</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           <div className="p-3 bg-green-500/10 rounded-md">
                               <Book className="h-6 w-6 text-green-500" />
                            </div>
                            <p className="text-lg font-semibold">{totalSubjects}</p>
                            <p className="text-xs text-muted-foreground">Subjects</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-yellow-500/10 rounded-md">
                               <UserCheck className="h-6 w-6 text-yellow-500" />
                            </div>
                            <p className="text-lg font-semibold">0</p>
                            <p className="text-xs text-muted-foreground">Active Sessions</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Attendance Trend</CardTitle>
                        <CardDescription>No data available yet</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={salesData}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                <Tooltip contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}/>
                                <Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Daily Attendance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={attendanceByDay} layout="vertical" barSize={12}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="date" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                                 />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "12px", paddingTop: '16px'}} iconType="circle" />
                                <Bar dataKey="Present" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Absent" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
