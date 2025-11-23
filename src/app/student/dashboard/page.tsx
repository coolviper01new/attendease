
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
import { QrCode, Clock, BookOpen, AlertTriangle, CalendarCheck, Info, CheckCircle2, Smartphone, ShieldCheck, ShieldAlert } from 'lucide-react';
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
import { doc, collection, query, where, updateDoc, serverTimestamp, getDocs, collectionGroup } from 'firebase/firestore';
import type { Student, Subject, Registration, Schedule, Attendance } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AttendanceDialog } from './components/attendance-dialog';
import { Progress } from '@/components/ui/progress';

const QrCodeDialog = ({
  studentId,
  subject,
  isDeviceRegistered,
  isCurrentDevice,
  onRegister,
}: {
  studentId: string;
  subject: Subject;
  isDeviceRegistered: boolean;
  isCurrentDevice: boolean;
  onRegister: () => void;
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
    <Dialog>
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


const SubjectCard = ({ subjectId, student }: {
    subjectId: string;
    student: Student | null;
}) => {
    const firestore = useFirestore();
    const [isClient, setIsClient] = useState(false);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
    const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [countdown, setCountdown] = useState(5);
    
    const subjectDocRef = useMemoFirebase(() => doc(firestore, 'subjects', subjectId), [firestore, subjectId]);
    const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);
    
    const studentAttendanceQuery = useMemoFirebase(() => {
        if (!student) return null;
        return query(
            collection(firestore, 'users', student.id, 'registrations'),
            where('subjectId', '==', subjectId)
        )
    }, [firestore, student, subjectId]);

    const studentAttendanceForSubjectQuery = useMemoFirebase(() => {
        if (!student) return null;
        return query(
            collection(firestore, `subjects/${subjectId}/attendanceSessions`),
        )
    }, [firestore, student, subjectId])

    const {data: attendanceRecords, isLoading: isAttendanceLoading} = useCollection<Attendance>(
        useMemoFirebase(() => {
            if(!student) return null;
            return query(
                collectionGroup(firestore, 'attendance'),
                where('studentId', '==', student.id),
                where('subjectId', '==', subjectId)
            )
        }, [firestore, student, subjectId])
    );
    
    const studentAttendanceDocRef = useMemoFirebase(() => {
        if (!subject?.isSessionActive || !student || !subject.activeSessionId) return null;
        return doc(firestore, `subjects/${subject.id}/attendanceSessions/${subject.activeSessionId}/attendance`, student.id);
    }, [firestore, subject, student]);

    const { data: attendanceRecord } = useDoc<Attendance>(studentAttendanceDocRef);

    useEffect(() => {
        setIsClient(true);
        const deviceId = localStorage.getItem('deviceId') || `device-${Math.random()}`;
        localStorage.setItem('deviceId', deviceId);
        setCurrentDeviceId(deviceId);
    }, []);

    const isPresent = !!attendanceRecord;

     useEffect(() => {
        if (isPresent && !isConfirmed) {
            setIsConfirmed(true);
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

    const handleRegisterDevice = async () => {
        if (!student || !currentDeviceId) return;
        const userDocRef = doc(firestore, 'users', student.id);
        const deviceData = { deviceId: currentDeviceId };
        
        updateDoc(userDocRef, deviceData).then(() => {
            // Re-fetch student data implicitly by state change in parent if needed
        }).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: deviceData
          }))
        })
    };

    if (isSubjectLoading) {
        return (
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full mt-2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
        );
    }

    if (!subject) return null;
    
    const isDeviceRegistered = !!student?.deviceId;
    const isCurrentDevice = isDeviceRegistered && student?.deviceId === currentDeviceId;

    const totalAttendance = attendanceRecords?.length ?? 0;
    const attendancePercentage = totalAttendance > 0 ? (totalAttendance / 20) * 100 : 0; // Assuming 20 total classes for percentage

    const renderFooter = () => {
        if (!isClient || !student) return null;

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
                onRegister={handleRegisterDevice}
            />
        );
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySchedules = [...(subject.lectureSchedules || []), ...(subject.labSchedules || [])].filter(s => s.day === today);


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
                 {todaySchedules.map((schedule, index) => (
                    <div key={`sched-${index}`} className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate font-medium text-foreground">
                        {schedule.startTime} - {schedule.endTime} @ {schedule.room}
                    </span>
                    </div>
                ))}
                 <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-muted-foreground">ATTENDANCE</span>
                        <span className="text-xs font-semibold">{totalAttendance} / 20</span>
                    </div>
                    <Progress value={attendancePercentage} className="h-2" />
                </div>
            </CardContent>
            <CardFooter className='flex-col gap-2 items-stretch pt-4'>
                {renderFooter()}
                <AttendanceDialog 
                    subject={subject} 
                    student={student}
                    isOpen={isAttendanceDialogOpen}
                    onOpenChange={setIsAttendanceDialogOpen}
                />
            </CardFooter>
          </Card>
    );
};


export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [deviceRegAlert, setDeviceRegAlert] = useState<{title: string, description: string} | null>(null);

  const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: student, isLoading: isStudentLoading, forceRefresh: refreshStudent } = useDoc<Student>(userDocRef);
  
  const registrationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'registrations'));
  }, [firestore, user]);
  const { data: userRegistrations, isLoading: areRegsLoading } = useCollection<Registration>(registrationsQuery);
  
  const enrolledSubjectIds = useMemo(() => userRegistrations?.map(reg => reg.subjectId) ?? [], [userRegistrations]);

  useEffect(() => {
    setIsClient(true);
    const deviceId = localStorage.getItem('deviceId') || `device-${Math.random()}`;
    localStorage.setItem('deviceId', deviceId);
    setCurrentDeviceId(deviceId);
  }, []);

  const handleRegisterDevice = async () => {
    if (!userDocRef || !currentDeviceId) return;
    const deviceData = { deviceId: currentDeviceId };
    
    updateDoc(userDocRef, deviceData).then(() => {
      setDeviceRegAlert({title: "Device Registered", description: "This device can now be used for QR code generation."});
      refreshStudent(); // Re-fetches the student data to update the UI
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
  const isLoading = isUserLoading || isStudentLoading || areRegsLoading;
  
  const todayWeekday = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);
  
  // This requires fetching all subjects, then filtering.
  // In a larger app, this might be optimized with a more complex query or data structure.
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  useEffect(() => {
    if(enrolledSubjectIds.length > 0) {
        const q = query(collection(firestore, 'subjects'), where('__name__', 'in', enrolledSubjectIds));
        getDocs(q).then(snapshot => {
            setAllSubjects(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Subject)));
        });
    }
  }, [enrolledSubjectIds, firestore]);

  const todaysSubjectIds = useMemo(() => 
    allSubjects?.filter(subject => 
        (subject.lectureSchedules || []).some(s => s.day === todayWeekday) || 
        (subject.labSchedules || []).some(s => s.day === todayWeekday)
    ).map(s => s.id) ?? [], 
  [allSubjects, todayWeekday]);

  if (isLoading) {
    return (
        <>
            <PageHeader
                title="My Dashboard"
                description="Loading your schedule and subjects..."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <div className="grid gap-6 md:grid-cols-2">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full mt-2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                     <Skeleton className="h-32 w-full" />
                     <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${student?.firstName || 'Student'}!`}
        description={`Here's your summary for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`}
      />

      {deviceRegAlert && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{deviceRegAlert.title}</AlertTitle>
          <AlertDescription>{deviceRegAlert.description}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <div>
                <h2 className="text-2xl font-headline font-bold mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-6 h-6 text-primary"/>
                    Today's Schedule
                </h2>
                {todaysSubjectIds.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {todaysSubjectIds.map(subjectId => (
                            <SubjectCard 
                                key={subjectId}
                                subjectId={subjectId}
                                student={student}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="mt-6 border-dashed">
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground py-12">You have no classes scheduled for today. Enjoy your day off!</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Separator />

            <div>
                <h2 className="text-2xl font-headline font-bold mb-4">All My Subjects</h2>
                {enrolledSubjectIds.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {enrolledSubjectIds.map((subjectId) => (
                             <SubjectCard 
                                key={subjectId}
                                subjectId={subjectId}
                                student={student}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="mt-6 border-dashed">
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground py-12">You are not enrolled in any subjects. Go to the Enrollment page to get started.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>

        <aside className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isDeviceRegistered ? <ShieldCheck className="text-green-500" /> : <ShieldAlert className="text-yellow-500" />}
                        Device Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isClient && !isDeviceRegistered ? (
                        <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Device Not Registered</AlertTitle>
                            <AlertDescription>
                                You must register this device to generate attendance QR codes.
                            </AlertDescription>
                            <Button onClick={handleRegisterDevice} size="sm" className="mt-4 w-full">Register This Device</Button>
                        </Alert>
                    ) : isClient && !isCurrentDevice ? (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Device Mismatch</AlertTitle>
                            <AlertDescription>
                                This is not your registered device. QR code generation is disabled.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert variant="default" className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400">
                           <ShieldCheck className="h-4 w-4" />
                            <AlertTitle>Device Registered</AlertTitle>
                            <AlertDescription>
                                This device is authorized to generate attendance QR codes.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">A summary of your attendance across all subjects will be shown here.</p>
                </CardContent>
            </Card>
        </aside>
      </div>
    </>
  );
}
