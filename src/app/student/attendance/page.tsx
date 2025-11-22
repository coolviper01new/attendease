import { PageHeader } from "@/components/page-header";
import { getStudentAttendance, mockStudents, mockSubjects } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { CheckCircle2, XCircle, Clock, BarChartHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const student = mockStudents[0];
const attendanceRecords = getStudentAttendance(student.id);

export default function StudentAttendancePage() {
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;

    return (
        <>
            <PageHeader
                title="My Attendance"
                description="Your attendance summary and history."
            />

            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <StatCard title="Present" value={presentCount} icon={CheckCircle2} description={`${((presentCount / attendanceRecords.length) * 100).toFixed(0)}% attendance rate`} />
                <StatCard title="Absent" value={absentCount} icon={XCircle} description={`${((absentCount / attendanceRecords.length) * 100).toFixed(0)}% absence rate`} />
                <StatCard title="Late" value={lateCount} icon={Clock} description={`${((lateCount / attendanceRecords.length) * 100).toFixed(0)}% late rate`} />
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
                                {attendanceRecords.length > 0 ? (
                                    attendanceRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
                                        const subject = mockSubjects.find(s => s.id === record.subjectId);
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
