import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockStudents, mockSubjects, mockWarnings, mockAttendanceSessions, mockAttendance } from "@/lib/data";
import { Users, Book, Clock, AlertTriangle, Activity } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function AdminDashboardPage() {
    const activeSessions = mockAttendanceSessions.filter(s => s.isActive).length;
    const attendanceData = mockAttendance.reduce((acc, record) => {
        const date = new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[date]) {
            acc[date] = { date, present: 0, absent: 0 };
        }
        if (record.status === 'present' || record.status === 'late') {
            acc[date].present++;
        } else {
            acc[date].absent++;
        }
        return acc;
    }, {} as Record<string, { date: string; present: number; absent: number }>);
    
    const chartData = Object.values(attendanceData).slice(-7);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of the school's attendance and academic status."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={mockStudents.length} icon={Users} description="All registered students" />
        <StatCard title="Total Subjects" value={mockSubjects.length} icon={Book} description="Across all blocks" />
        <StatCard title="Active Sessions" value={activeSessions} icon={Clock} description="Attendance sessions currently open" />
        <StatCard title="Warnings Issued" value={mockWarnings.length} icon={AlertTriangle} description="Total consecutive absence warnings" />
      </div>
      <div className="grid gap-4 mt-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Attendance Trends
                </CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
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
                        <Bar dataKey="present" fill="hsl(var(--primary))" name="Present" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
