import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mockStudents, mockSubjects, mockWarnings, mockAttendance } from "@/lib/data";
import { Users, BookCheck, Wallet, Send, BarChartHorizontal, UserCheck, UserX, TrendingUp, TrendingDown } from "lucide-react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, LineChart } from "recharts";

export default function AdminDashboardPage() {
    const totalStudents = mockStudents.length;
    const totalSubjects = mockSubjects.length;
    const totalWarnings = mockWarnings.length;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('en-CA');
    }).reverse();

    const attendanceByDay = last7Days.map(date => {
        const records = mockAttendance.filter(a => new Date(a.date).toLocaleDateString('en-CA') === date);
        const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Present: present,
            Absent: absent
        };
    });
    
    const salesData = [
        { name: 'Jan', sales: 4000 },
        { name: 'Feb', sales: 3000 },
        { name: 'Mar', sales: 5000 },
        { name: 'Apr', sales: 4500 },
        { name: 'May', sales: 6000 },
        { name: 'Jun', sales: 5500 },
    ];


    return (
        <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-normal">Ratings</CardTitle>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold">13k</p>
                            <span className="text-sm text-green-400 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> +15.6%</span>
                        </div>
                        <CardDescription className="text-xs">Year of 2021</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src="https://picsum.photos/seed/deco1/100/120" alt="decoration" width={100} height={120} className="absolute bottom-0 right-4" />
                    </CardContent>
                </Card>
                 <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-normal">Sessions</CardTitle>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold">24.5k</p>
                            <span className="text-sm text-red-400 flex items-center gap-1"><TrendingDown className="h-4 w-4" /> -20%</span>
                        </div>
                        <CardDescription className="text-xs">Last Week</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Image src="https://picsum.photos/seed/deco2/100/120" alt="decoration" width={100} height={120} className="absolute bottom-0 right-4" />
                    </CardContent>
                </Card>
                 <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-normal">Transactions</CardTitle>
                        <CardDescription>Total 48.5% Growth this month</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-primary/10 rounded-md">
                               <UserCheck className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-lg font-semibold">245k</p>
                            <p className="text-xs text-muted-foreground">Sales</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           <div className="p-3 bg-green-500/10 rounded-md">
                               <Users className="h-6 w-6 text-green-500" />
                            </div>
                            <p className="text-lg font-semibold">12.5k</p>
                            <p className="text-xs text-muted-foreground">Customers</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-yellow-500/10 rounded-md">
                               <BookCheck className="h-6 w-6 text-yellow-500" />
                            </div>
                            <p className="text-lg font-semibold">1.54k</p>
                            <p className="text-xs text-muted-foreground">Product</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Total Sales</CardTitle>
                        <CardDescription>$21,845</CardDescription>
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
                            Sale Statistics
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
