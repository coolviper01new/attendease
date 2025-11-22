import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockStudents, mockSubjects, mockWarnings, mockAttendanceSessions, mockAttendance } from "@/lib/data";
import { Users, BookCheck, Wallet, Send, BarChartHorizontal } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

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

    return (
        <>
            <PageHeader
                title="Dashboard"
                description="An overview of your sales and performance."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Sale" value="3,256" icon={Users} description="+15% from last month" color="bg-blue-500" />
                <StatCard title="Last Month Sale" value="6,257" icon={BookCheck} description="+20% from last month" color="bg-green-500" />
                <StatCard title="Total Revenue" value="$34,650" icon={Wallet} description="+8% from last month" color="bg-purple-500" />
                <StatCard title="Total Email Sent" value="11,320" icon={Send} description="-2% from last month" color="bg-gray-700" />
            </div>
            <div className="grid gap-4 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-xl">
                            <BarChartHorizontal className="h-5 w-5" />
                            Sale Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={attendanceByDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "12px"}} />
                                <Bar dataKey="Present" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="Absent" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
