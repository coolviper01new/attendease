

export type SchoolYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type Semester = {
  id: string;
  name: string;
  schoolYearId: string;
  startDate: string;
  endDate: string;
};

export type YearLevel = {
  id: string;
  name: string;
  description: string;
};

export type Block = {
  id: string;
  name: string;
  yearLevelId: string;
};

export type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
};

export type Subject = {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  hasLab: boolean;
  lectureSchedules: Schedule[];
  labSchedules?: Schedule[];
  block: string;
  schoolYear: string;
  yearLevel: string;
  enrollmentStatus: 'closed' | 'open';
  deleted?: boolean;
};

export type Registration = {
  id: string;
  studentId: string;
  subjectId: string;
  block: string;
  registrationDate: any; // Can be a Date or a Firestore Timestamp
};

export type AttendanceSession = {
  id: string;
  subjectId: string;
  isActive: boolean;
  startTime: any;
  endTime?: any;
  qrCodeSecret: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type Attendance = {
  id:string;
  studentId: string;
  subjectId: string;
  timestamp: any;
  status: AttendanceStatus;
  recordedBy: string; // adminId
  date: string;
};

export type Warning = {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  reason: string;
  absenceDates: string[];
};

export type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'student' | 'admin';
    avatarUrl?: string;
}

export type Student = User & {
  role: 'student';
  studentNumber: string;
  course: string;
  deviceId?: string;
  name: string;
};

export type Admin = User & {
  role: 'admin';
  facultyId: string;
  name: string;
};

    
