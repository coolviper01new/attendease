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

export type Subject = {
  id: string;
  name: string;
  code: string;
  description: string;
  schedule: { day: string; startTime: string; endTime: string; room: string };
  blockId: string;
  semesterId: string;
};

export type Registration = {
  id: string;
  studentId: string;
  subjectId: string;
  qrCodeSecret: string;
};

export type AttendanceSession = {
  id: string;
  subjectId: string;
  isActive: boolean;
  activationTime?: string;
  deactivationTime?: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type Attendance = {
  id:string;
  studentId: string;
  subjectId: string;
  date: string;
  status: AttendanceStatus;
  recordedBy: string; // adminId
};

export type Warning = {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  reason: string;
  absenceDates: string[];
};

export type Student = {
  id: string;
  name: string;
  email: string;
  studentNumber: string;
  blockId: string;
  avatarUrl: string;
  deviceId?: string;
};

export type Admin = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};
