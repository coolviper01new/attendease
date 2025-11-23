
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Clock, BookOpen, AlertTriangle, CalendarCheck, Info, CheckCircle2, ListChecks } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Student, Subject, Registration, Schedule, AttendanceSession, Attendance } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AttendanceDialog } from './components/attendance-dialog';

const QrCodeDialog = ({
  studentId,
  subject,
  isDeviceRegistered,
  isCurrentDevice,
  onRegister,
  isOpen,
  onOpenChange,
}: {
  studentId: string;
  subject: Subject;
  isDeviceRegistered: boolean;
  isCurrentDevice: boolean;
  onRegister: () => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  if (!isDeviceRegistered) {
    return (
      <Button onClick={onRegister} className="w-full">
        Register This Device
      </Button>
    );
  }

  if (!isCurrentDevice) {
    return (
      <Alert variant="destructive" className="mt-4 text-center">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Device Mismatch</AlertTitle>
        <AlertDescription>
          Please use your registered device to generate QR codes.
        </AlertDescription>
      </Alert>
    );
  }

  if (!subject.isSessionActive) {
     return (
      <Alert className="mt-4 text-center">
        <Info className="h-4 w-4" />
        <AlertTitle>No Active Session</AlertTitle>
        <AlertDescription>
          There is no active attendance session for this subject right now.
        </AlertDescription>
      </Alert>
    );
  }

  const qrData = JSON.stringify({ studentId, subjectId: subject.id, qrCodeSecret: subject.activeSessionSecret });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    qrData
  )}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <QrCode className="mr-2 h-4 w-4" /> View QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Attendance QR Code</DialogTitle>
          <DialogDescription>
            Present this code for {subject.name} ({subject.block}) for marking.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 bg-white rounded-lg">
          <Image
            src={qrCodeUrl}
            alt="Attendance QR Code"
            width={250}
            height={250}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


const SubjectCard = ({ subject, student, isClient, isDeviceRegistered, isCurrentDevice, onRegisterDevice, isToday }: {
    subject: Subject;
    student: Student | null;
    isClient: boolean;
    isDeviceRegistered: boolean;
    isCurrentDevice: boolean;
    onRegisterDevice: () => void;
    isToday?: boolean;
}) => {
    const firestore = useFirestore();
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [countdown, setCountdown] = useState(5);
    
    const studentAttendanceDocRef = useMemoFirebase(() => {
        if (!subject.isSessionActive || !student) return null;
        return doc(firestore, `subjects/${subject.id}/attendanceSessions/${subject.activeSessionId}/attendance`, student.id);
    }, [firestore, subject.id, subject.isSessionActive, subject.activeSessionId, student]);

    const { data: attendanceRecord } = useDoc<Attendance>(studentAttendanceDocRef);

    const isPresent = !!attendanceRecord;

     useEffect(() => {
        if (isPresent && !isConfirmed) {
            setIsConfirmed(true);
            setIsQrDialogOpen(false); // Close QR dialog on confirmation
            setCountdown(5);
        }
    }, [isPresent, isConfirmed]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isConfirmed && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            setIsConfirmed(false); // Reset confirmation state
        }
        return () => clearInterval(timer);
    }, [isConfirmed, countdown]);

    const getTodaySchedules = (schedules: Schedule[] = [], day: string) => {
        return schedules.filter(sc => sc.day === day);
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayLecSchedules = getTodaySchedules(subject.lectureSchedules, today);
    const todayLabSchedules = getTodaySchedules(subject.labSchedules, today);

    const schedulesToShow = isToday ? [...todayLecSchedules, ...todayLabSchedules] : subject.lectureSchedules;
    const labSchedulesToShow = isToday ? [] : subject.labSchedules;

    const renderFooter = () => {
        if (!isClient || !student) {
            return null; // Or a skeleton/placeholder
        }
        if (isConfirmed) {
            return (
                <div className="w-full text-center p-4 bg-green-600/10 rounded-md">
                    <p className='text-green-700 font-bold'>Attendance Recorded!</p>
                    <p className='text-sm text-muted-foreground'>Closing in {countdown}s...</p>
                </div>
            );
        }
        if (isPresent) {
             return (
                <Button disabled className="w-full bg-green-600/20 text-green-700 hover:bg-green-600/30">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Present
                </Button>
            );
        }
        return (
            <QrCodeDialog
                studentId={student.id}
                subject={subject}
                isDeviceRegistered={isDeviceRegistered}
                isCurrentDevice={isCurrentDevice}
                onRegister={onRegisterDevice}
                isOpen={isQrDialogOpen}
                onOpenChange={setIsQrDialogOpen}
            />
        );
    }

    return (
        <Card key={subject.id} className="flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-headline text-xl mb-1">
                    {subject.name}
                  </CardTitle>
                  <CardDescription>{subject.code} ({subject.block})</CardDescription>
                </div>
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              {schedulesToShow.map((schedule, index) => (
                <div key={`lec-${index}`} className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate font-medium text-foreground">
                    {isToday ? '' : 'Lec: '}{schedule.day}, {schedule.startTime} - {schedule.endTime} @ {schedule.room}
                  </span>
                </div>
              ))}
              {labSchedulesToShow?.map((schedule, index) => (
                <div key={`lab-${index}`} className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    Lab: {schedule.day}, {schedule.startTime} - {schedule.endTime} @ {schedule.room}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter className='flex-col gap-2 items-stretch'>
              {renderFooter()}
               <AttendanceDialog 
                subject={subject} 
                student={student}
                isOpen={isAttendanceDialogOpen}
                onOpenChange={setIsAttendanceDialogOpen}
              />
            </CardFooter>
          </Card>
    )
}

export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
  const [areSubjectsLoading, setAreSubjectsLoading] = useState(true);
  const [deviceRegAlert, setDeviceRegAlert] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: student, isLoading: isStudentLoading } = useDoc<Student>(userDocRef);
  
  const registrationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'registrations'));
  }, [firestore, user]);
  const { data: userRegistrations, isLoading: areRegsLoading } = useCollection<Registration>(registrationsQuery);

  useEffect(() => {
    setIsClient(true);
    const deviceId = localStorage.getItem('deviceId') || `device-${Math.random()}`;
    localStorage.setItem('deviceId', deviceId);
    setCurrentDeviceId(deviceId);
  }, []);
  
   useEffect(() => {
    if (areRegsLoading || !userRegistrations) {
        setAreSubjectsLoading(true);
        return;
    };
    
    if (userRegistrations.length === 0) {
      setEnrolledSubjects([]);
      setAreSubjectsLoading(false);
      return;
    }

    const subjectIds = userRegistrations.map(reg => reg.subjectId);
    
    const q = query(collection(firestore, 'subjects'), where('__name__', 'in', subjectIds));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const updatedSubjects = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Subject[]);
        setEnrolledSubjects(currentSubjects => {
            const subjectsMap = new Map(currentSubjects.map(s => [s.id, s]));
            updatedSubjects.forEach(subject => {
                subjectsMap.set(subject.id, subject);
            });
            return Array.from(subjectsMap.values());
        });
        setAreSubjectsLoading(false);
    }, (error) => {
        console.error("Error fetching enrolled subjects in real-time", error);
        setAreSubjectsLoading(false);
    });

    return () => unsubscribe();
  }, [userRegistrations, areRegsLoading, firestore]);
  

  const handleRegisterDevice = async () => {
    if (!userDocRef || !currentDeviceId) return;
    const deviceData = { deviceId: currentDeviceId };
    
    updateDoc(userDocRef, deviceData).then(() => {
      setDeviceRegAlert("This device has been successfully registered for QR code generation.");
    }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: deviceData
      }))
    })
  };

  const isDeviceRegistered = !!student?.deviceId;
  const isCurrentDevice = isDeviceRegistered && student?.deviceId === currentDeviceId;
  const isLoading = isUserLoading || isStudentLoading || areRegsLoading || areSubjectsLoading;
  
  const todayWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysSubjects = useMemo(() => 
    enrolledSubjects.filter(subject => 
        subject.lectureSchedules.some(s => s.day === todayWeekday) || 
        subject.labSchedules?.some(s => s.day === todayWeekday)
    ), [enrolledSubjects, todayWeekday]);


  if (isLoading) {
    return (
        <>
            <PageHeader
                title="My Dashboard"
                description="Loading your schedule and subjects..."
            />
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-48 mb-4" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                        ))}
                    </div>
                </div>
                <div>
                    <Skeleton className="h-8 w-48 mb-4" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
  }

  return (
    <>
      <PageHeader
        title="My Dashboard"
        description={`Welcome back, ${student?.firstName || 'student'}! Here's what's happening.`}
      />

      {deviceRegAlert && (
        <Alert className="mb-6">
          <AlertTitle>Device Registered</AlertTitle>
          <AlertDescription>{deviceRegAlert}</AlertDescription>
        </Alert>
      )}

      {isClient && !isDeviceRegistered && !deviceRegAlert && (
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/20 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900">
          <Info className="h-4 w-4" />
          <AlertTitle>Device Registration Required</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            To generate QR codes for attendance, you must register your primary device. This is a one-time action.
            <Button onClick={handleRegisterDevice} size="sm" className="mt-2 sm:mt-0 sm:ml-4 w-full sm:w-auto">Register This Device</Button>
          </AlertDescription>
        </Alert>
      )}

    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-headline font-bold mb-4 flex items-center gap-2">
                <CalendarCheck className="w-6 h-6 text-primary"/>
                Today's Schedule
            </h2>
             {todaysSubjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {todaysSubjects.map(subject => (
                        <SubjectCard 
                            key={subject.id}
                            subject={subject}
                            student={student}
                            isClient={isClient}
                            isDeviceRegistered={isDeviceRegistered}
                            isCurrentDevice={isCurrentDevice}
                            onRegisterDevice={handleRegisterDevice}
                            isToday={true}
                        />
                    ))}
                </div>
             ) : (
                <Card className="mt-6 border-dashed">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">You have no classes scheduled for today. Enjoy your day off!</p>
                    </CardContent>
                </Card>
             )}
        </div>
        
        <Separator />

        <div>
             <h2 className="text-2xl font-headline font-bold mb-4">All My Subjects</h2>
             {enrolledSubjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {enrolledSubjects.map((subject) => (
                        <SubjectCard 
                            key={subject.id}
                            subject={subject}
                            student={student}
                            isClient={isClient}
                            isDeviceRegistered={isDeviceRegistered}
                            isCurrentDevice={isCurrentDevice}
                            onRegisterDevice={handleRegisterDevice}
                        />
                    ))}
                </div>
              ) : (
                 <Card className="mt-6 border-dashed">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">You are not enrolled in any subjects. Go to the Enrollment page to get started.</p>
                    </CardContent>
                </Card>
              )}
        </div>
    </div>
      
    </>
  );
}
