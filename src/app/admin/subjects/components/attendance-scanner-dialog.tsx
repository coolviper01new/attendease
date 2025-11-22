
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  PlayCircle,
  StopCircle,
  Clock,
  Users,
  CameraOff,
  CheckCircle,
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  collectionGroup,
} from 'firebase/firestore';
import { validateAttendance } from '@/ai/flows/attendance-validator';
import type {
  Subject,
  AttendanceSession,
  Attendance,
  Student,
} from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface AttendanceScannerDialogProps {
  subject: Subject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function AttendanceScannerDialog({
  subject,
  open,
  onOpenChange,
  onRefresh
}: AttendanceScannerDialogProps) {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);


  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [presentStudents, setPresentStudents] = useState<
    (Student & { id: string })[]
  >([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [alertInfo, setAlertInfo] = useState<{title: string, description: string, variant: 'default' | 'destructive'} | null>(null);


  // --- Data Fetching Hooks ---
  const activeSessionQuery = useMemoFirebase(
    () =>
      open ? query(
        collection(firestore, 'subjects', subject.id, 'attendanceSessions'),
        where('isActive', '==', true)
      ) : null,
    [firestore, subject.id, open] // Re-run query if dialog is re-opened
  );
  const { data: activeSessions, forceRefresh: refreshSessions } =
    useCollection<AttendanceSession>(activeSessionQuery);
  const activeSession = activeSessions?.[0];
  
  const todayDateString = new Date().toISOString().split('T')[0];
  
  const todaysAttendanceQuery = useMemoFirebase(
      () => 
          open ? query(
              collectionGroup(firestore, 'attendance'),
              where('subjectId', '==', subject.id),
              where('date', '==', todayDateString)
          ) : null,
      [firestore, subject.id, open, todayDateString]
  );
  const { data: todaysAttendance, isLoading: isAttendanceLoading } = useCollection<Attendance>(todaysAttendanceQuery);

  // This effect runs when the dialog opens or attendance data changes, to load all students present today.
  useEffect(() => {
    const fetchInitialAttendees = async () => {
        if (todaysAttendance && open) {
            const studentIds = todaysAttendance.map(att => att.studentId);
            if (studentIds.length > 0) {
              const uniqueStudentIds = [...new Set(studentIds)]; // Handle potential duplicates if any
              const studentRefs = uniqueStudentIds.map(id => doc(firestore, 'users', id));
              
              // This can be slow with many students. Consider denormalizing student name onto attendance record.
              const studentSnaps = await Promise.all(studentRefs.map(ref => getDoc(ref).catch(e => null))); // Non-blocking, catch errors
              const studentsData = studentSnaps
                .filter(snap => snap && snap.exists())
                .map(snap => ({ id: snap!.id, ...snap!.data() } as Student & { id: string }));
              
              setPresentStudents(studentsData.sort((a, b) => a.firstName.localeCompare(b.firstName)));
            } else {
                setPresentStudents([]);
            }
        } else if (!open) {
            // Clear list when dialog closes
            setPresentStudents([]);
        }
    };
    
    fetchInitialAttendees();
  }, [todaysAttendance, open, firestore]);


  // --- Clock effect ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStopSession = useCallback(async () => {
    if (!activeSession) {
      setAlertInfo({ title: 'No active session to stop.', description: '', variant: 'default' });
      return;
    }
    const sessionRef = doc(
      firestore,
      'subjects',
      subject.id,
      'attendanceSessions',
      activeSession.id
    );

    const sessionData = { isActive: false, endTime: serverTimestamp() };
    updateDoc(sessionRef, sessionData).catch(error => {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: sessionRef.path,
                operation: 'update',
                requestResourceData: sessionData
            })
        )
    });

    setAlertInfo({ title: 'Attendance Session Stopped', description: '', variant: 'default'});
    if(intervalRef.current) clearInterval(intervalRef.current);
    setTimeRemaining(null);
  }, [activeSession, firestore, subject.id]);


  // Countdown timer effect
  useEffect(() => {
    if (activeSession && timeRemaining === null) {
      // Session is active, but timer hasn't started, so start it.
      const sessionStartTime = (activeSession.startTime as any)?.toDate();
      if (sessionStartTime) {
          const elapsedSeconds = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
          const remaining = (20 * 60) - elapsedSeconds;
          setTimeRemaining(remaining > 0 ? remaining : 0);
      } else {
          setTimeRemaining(20 * 60);
      }
    }

    if (timeRemaining !== null && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => (prev ? prev - 1 : 0));
      }, 1000);
    } else if (timeRemaining === 0) {
      handleStopSession();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeRemaining, activeSession, handleStopSession]);


  // --- Camera and QR Scanner Effects ---
  useEffect(() => {
    if (!open) {
      // Stop scanner and camera when dialog is closed
      qrScannerRef.current?.stop();
      qrScannerRef.current?.destroy();
      qrScannerRef.current = null;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      return;
    }

    const getCameraPermission = async () => {
      // only ask for permission if it's not been determined yet
      if (hasCameraPermission === null) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasCameraPermission(true);
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          setAlertInfo({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this feature.',
          });
        }
      }
    };

    getCameraPermission();

    // Cleanup on unmount or when `open` becomes false
    return () => {
      qrScannerRef.current?.stop();
      qrScannerRef.current?.destroy();
      qrScannerRef.current = null;
       if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [open, hasCameraPermission]);

  useEffect(() => {
    if (videoRef.current && hasCameraPermission && !qrScannerRef.current) {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          setScannedData((current) =>
            current !== result.data ? result.data : current
          );
        },
        {
          onDecodeError: () => {},
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      qrScanner.start();
      qrScannerRef.current = qrScanner;
    }
  }, [hasCameraPermission]);

  const processScan = useCallback(async () => {
    if (
      !scannedData ||
      isProcessing ||
      !activeSession ||
      !adminUser
    )
      return;

    setIsProcessing(true);
    setAlertInfo(null);

    try {
      const qrData = JSON.parse(scannedData);

      if (presentStudents.some((p) => p.id === qrData.studentId)) {
        setAlertInfo({
          variant: 'destructive',
          title: 'Already Marked',
          description: 'This student has already been marked present.',
        });
        setIsProcessing(false);
        setScannedData(null);
        return;
      }
      
      const validationInput = {
        qrCodeData: scannedData,
        qrCodeSecret: activeSession.qrCodeSecret,
        attendanceSessionActive: activeSession.isActive,
      };
      
      const result = await validateAttendance(validationInput);

      if (result.isValid) {
        const studentDocRef = doc(firestore, 'users', qrData.studentId);
        const studentDoc = await getDoc(studentDocRef);
        
        if (studentDoc.exists()) {
            const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student & { id: string };
            const studentName = `${studentData.firstName} ${studentData.lastName}`;
            
            setConfirmationMessage(`Attendance of ${studentName} is Recorded`);
            
            setPresentStudents(prev => [...prev, studentData].sort((a,b) => a.firstName.localeCompare(b.firstName)));

            const attendanceDocRef = doc(firestore, `subjects/${subject.id}/attendanceSessions/${activeSession.id}/attendance`, qrData.studentId);
            const attendanceData = {
              studentId: qrData.studentId,
              subjectId: subject.id,
              timestamp: serverTimestamp(),
              status: 'present',
              recordedBy: adminUser.uid,
              date: todayDateString,
            };
            setDoc(attendanceDocRef, attendanceData).catch(error => {
                errorEmitter.emit(
                    'permission-error',
                    new FirestorePermissionError({
                        path: attendanceDocRef.path,
                        operation: 'create',
                        requestResourceData: attendanceData,
                    })
                )
            });
        } else {
             setAlertInfo({
              variant: 'destructive',
              title: 'Student Not Found',
              description: 'The student ID from the QR code does not exist in the system.',
            });
        }
      } else {
        setAlertInfo({
          variant: 'destructive',
          title: 'Invalid QR Code',
          description: result.reason || 'Could not validate attendance.',
        });
      }
    } catch (error: any) {
        console.error('Error processing QR code:', error);
        setAlertInfo({
        variant: 'destructive',
        title: 'Scan Error',
        description: 'The scanned QR code is not valid for this system.',
        });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setScannedData(null);
        setConfirmationMessage(null); // Clear confirmation message
        setAlertInfo(null);
      }, 3000); // 3-second cooldown
    }
  }, [
    scannedData,
    isProcessing,
    activeSession,
    adminUser,
    firestore,
    subject.id,
    presentStudents,
    todayDateString
  ]);

  useEffect(() => {
    processScan();
  }, [processScan]);

  const handleStartSession = async () => {
    if (activeSession) {
      setAlertInfo({ title: 'Session already active.', description: '', variant: 'default' });
      return;
    }
    const newSessionSecret = `secret-${subject.id}-${Date.now()}`;
    const sessionCollectionRef = collection(
      firestore,
      'subjects',
      subject.id,
      'attendanceSessions'
    );
    const sessionData = {
      subjectId: subject.id,
      startTime: serverTimestamp(),
      isActive: true,
      qrCodeSecret: newSessionSecret,
    };
    addDoc(sessionCollectionRef, sessionData).catch(error => {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: sessionCollectionRef.path,
                operation: 'create',
                requestResourceData: sessionData
            })
        );
    });

    setTimeRemaining(20 * 60); // Start 20 minute timer
    setAlertInfo({
      title: 'Attendance Session Started',
      description: 'You can now start scanning student QR codes.',
      variant: 'default',
    });
    refreshSessions();
  };
  
  const isSessionActive = !!activeSession;
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const onDialogClose = (isOpen: boolean) => {
    if (!isOpen && activeSession) {
      handleStopSession();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={onDialogClose}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-bold font-headline">Attendance Scanner</DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">{subject.name} ({subject.code})</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-full overflow-hidden">
          {/* Left Column: Scanner and Controls */}
          <div className="flex flex-col gap-4 h-full">
            <div className="aspect-video w-full rounded-lg border bg-background overflow-hidden relative flex items-center justify-center">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {confirmationMessage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-600/90 text-white p-4 text-center">
                    <CheckCircle className="h-24 w-24 mb-4" />
                    <p className="text-5xl font-bold">{confirmationMessage}</p>
                </div>
              )}

              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                  <Alert variant="destructive">
                    <CameraOff className="h-4 w-4" />
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                      Please allow camera access to use this feature.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              {!isSessionActive && hasCameraPermission && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4">
                  <div className="text-center">
                    <p className="font-semibold">Session Inactive</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Start Session" to begin scanning.
                    </p>
                  </div>
                </div>
              )}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="text-white text-lg animate-pulse">
                    Processing...
                  </p>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 grid grid-cols-2 gap-2">
                {!isSessionActive ? (
                  <Button onClick={handleStartSession} className="w-full col-span-2">
                    <PlayCircle className="mr-2 h-4 w-4" /> Start Session
                  </Button>
                ) : (
                  <>
                    <Button
                        onClick={handleStopSession}
                        variant="destructive"
                        className="w-full"
                    >
                        <StopCircle className="mr-2 h-4 w-4" /> Stop Session
                    </Button>
                     <Button variant="outline" className="w-full text-lg font-bold" disabled>
                        <Clock className="mr-2 h-4 w-4 animate-pulse" />
                        {timeRemaining !== null ? formatTime(timeRemaining) : '00:00'}
                    </Button>
                  </>
                )}
            </div>
            {alertInfo && (
              <Alert variant={alertInfo.variant} className="flex-shrink-0">
                <AlertTitle>{alertInfo.title}</AlertTitle>
                {alertInfo.description && <AlertDescription>{alertInfo.description}</AlertDescription>}
              </Alert>
            )}
             <Card className="flex-shrink-0">
                <CardHeader className="pb-4 text-center">
                  <p className="text-2xl font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-2xl font-bold">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </CardHeader>
            </Card>
          </div>

          {/* Right Column: Present Students */}
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Present Students ({presentStudents.length})
              </CardTitle>
              <CardDescription>
                {isSessionActive
                  ? 'Students will appear here as they scan in.'
                  : 'Start a session to view attendance.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
              {presentStudents.length > 0 ? (
                <div className="space-y-4">
                  {presentStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={student.avatarUrl} />
                        <AvatarFallback>
                          {student.firstName?.charAt(0)}
                          {student.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.studentNumber}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground text-center py-8">
                    {isSessionActive
                        ? 'No students have checked in yet.'
                        : 'No active session.'}
                    </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
