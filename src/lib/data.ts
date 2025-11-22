import type { Student, Admin, Subject, Attendance, Warning, AttendanceSession } from './types';

export const mockAdmin: Admin = {
  id: 'admin01',
  name: 'Dr. Evelyn Reed',
  email: 'e.reed@example.com',
  avatarUrl: 'https://picsum.photos/seed/admin/100/100'
};

export const mockStudents: Student[] = [
  { id: 'student01', name: 'Alice Johnson', email: 'alice.j@example.com', studentNumber: 'S001', blockId: 'block01', avatarUrl: 'https://picsum.photos/seed/avatar1/100/100', deviceId: 'device-alice-123' },
  { id: 'student02', name: 'Bob Williams', email: 'bob.w@example.com', studentNumber: 'S002', blockId: 'block01', avatarUrl: 'https://picsum.photos/seed/avatar2/100/100' },
  { id: 'student03', name: 'Charlie Brown', email: 'charlie.b@example.com', studentNumber: 'S003', blockId: 'block01', avatarUrl: 'https://picsum.photos/seed/avatar3/100/100' },
  { id: 'student04', name: 'Diana Miller', email: 'diana.m@example.com', studentNumber: 'S004', blockId: 'block02', avatarUrl: 'https://picsum.photos/seed/avatar4/100/100' },
];

export const mockSubjects: Subject[] = [
  {
    id: 'subj01',
    name: 'Advanced Web Development',
    code: 'CS401',
    description: 'Deep dive into modern web technologies.',
    schedule: { day: 'Monday', startTime: '10:00', endTime: '12:00', room: 'Room 303' },
    blockId: 'block01',
    semesterId: 'sem01'
  },
  {
    id: 'subj02',
    name: 'Machine Learning Fundamentals',
    code: 'AI201',
    description: 'Introduction to ML concepts and algorithms.',
    schedule: { day: 'Wednesday', startTime: '13:00', endTime: '15:00', room: 'Room 101' },
    blockId: 'block01',
    semesterId: 'sem01'
  },
  {
    id: 'subj03',
    name: 'Database Systems',
    code: 'DB301',
    description: 'Design and implementation of database systems.',
    schedule: { day: 'Friday', startTime: '09:00', endTime: '11:00', room: 'Lab 5' },
    blockId: 'block02',
    semesterId: 'sem01'
  }
];

export const mockAttendance: Attendance[] = [
    { id: 'att01', studentId: 'student01', subjectId: 'subj01', date: '2024-05-20', status: 'present', recordedBy: 'admin01' },
    { id: 'att02', studentId: 'student02', subjectId: 'subj01', date: '2024-05-20', status: 'present', recordedBy: 'admin01' },
    { id: 'att03', studentId: 'student03', subjectId: 'subj01', date: '2024-05-20', status: 'absent', recordedBy: 'admin01' },
    { id: 'att04', studentId: 'student01', subjectId: 'subj02', date: '2024-05-22', status: 'present', recordedBy: 'admin01' },
    { id: 'att05', studentId: 'student02', subjectId: 'subj02', date: '2024-05-22', status: 'late', recordedBy: 'admin01' },
    { id: 'att06', studentId: 'student03', subjectId: 'subj01', date: '2024-05-13', status: 'absent', recordedBy: 'admin01' },
    { id: 'att07', studentId: 'student03', subjectId: 'subj01', date: '2024-05-06', status: 'absent', recordedBy: 'admin01' },
];

export const mockWarnings: Warning[] = [
    {
        id: 'warn01',
        studentId: 'student03',
        subjectId: 'subj01',
        date: '2024-05-20',
        reason: 'AI determined 3 consecutive absences on 2024-05-06, 2024-05-13, 2024-05-20.',
        absenceDates: ['2024-05-06', '2024-05-13', '2024-05-20']
    }
];

export const mockAttendanceSessions: AttendanceSession[] = [
    { id: 'session01', subjectId: 'subj01', isActive: true, activationTime: new Date().toISOString() },
    { id: 'session02', subjectId: 'subj02', isActive: false },
    { id: 'session03', subjectId: 'subj03', isActive: false },
];

export const getStudentSubjects = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (!student) return [];
    
    const studentBlockId = student.blockId;
    return mockSubjects.filter(s => s.blockId === studentBlockId);
}

export const getStudentAttendance = (studentId: string) => {
    return mockAttendance.filter(a => a.studentId === studentId);
}
