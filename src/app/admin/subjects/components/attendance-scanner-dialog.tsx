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
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
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
} from 'firebase/firestore';
import { validateAttendance } from '@/ai/flows/attendance-validator';
import type {
  Subject,
  AttendanceSession,
  Attendance,
  Student,
} from '@/lib/types';

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
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [presentStudents, setPresentStudents] = useState<
    (Student & { id: string })[]
  >([]);

  // --- Data Fetching Hooks ---
  const activeSessionQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'subjects', subject.id, 'attendanceSessions'),
        where('isActive', '==', true)
      ),
    [firestore, subject.id, open] // Re-run query if dialog is re-opened
  );
  const { data: activeSessions, forceRefresh: refreshSessions } =
    useCollection<AttendanceSession>(activeSessionQuery);
  const activeSession = activeSessions?.[0];

  const sessionAttendanceQuery = useMemoFirebase(() => {
    if (!activeSession) return null;
    return query(
      collection(
        firestore,
        `subjects/${subject.id}/attendanceSessions/${activeSession.id}/attendance`
      )
    );
  }, [firestore, subject.id, activeSession]);
  const { data: attendanceRecords } =
    useCollection<Attendance>(sessionAttendanceQuery);

  // --- Effect to fetch student details ---
  useEffect(() => {
    if (!attendanceRecords) {
      setPresentStudents([]);
      return;
    }
    const studentIds = attendanceRecords.map((att) => att.studentId);
    if (studentIds.length === 0) {
      setPresentStudents([]);
      return;
    }
    
    const fetchStudents = async () => {
        try {
             const studentRefs = studentIds.map(id => doc(firestore, 'users', id));
             const studentSnaps = await Promise.all(studentRefs.map(ref => getDoc(ref)));
             const studentsData = studentSnaps
                .filter(snap => snap.exists())
                .map(snap => ({ id: snap.id, ...snap.data() } as Student & {id: string}));
            setPresentStudents(studentsData.sort((a, b) => a.firstName.localeCompare(b.firstName)));
        } catch (error) {
            console.error("Error fetching present students:", error);
        }
    };

    fetchStudents();
  }, [attendanceRecords, firestore]);
  

  // --- Clock effect ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
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
      }
    };
  }, [open]);

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
      !adminUser ||
      !sessionAttendanceQuery
    )
      return;

    setIsProcessing(true);

    try {
      const qrData = JSON.parse(scannedData);

      if (presentStudents.some((p) => p.id === qrData.studentId)) {
        toast({
          variant: 'destructive',
          title: 'Already Marked',
          description: 'This student has already been marked present.',
        });
        return;
      }
      
      const studentRegQuery = query(collectionGroup(firestore, 'registrations'), where('studentId', '==', qrData.studentId), where('subjectId', '==', subject.id));
      const studentRegSnapshot = await getDocs(studentRegQuery);
      const isRegistered = !studentRegSnapshot.empty;

      const validationInput = {
        qrCodeData: scannedData,
        subjectId: subject.id,
        studentId: qrData.studentId,
        qrCodeSecret: activeSession.qrCodeSecret,
        attendanceSessionActive: activeSession.isActive,
        studentRegistered: isRegistered,
      };

      const result = await validateAttendance(validationInput);

      if (result.isValid) {
        const studentDoc = await getDoc(doc(firestore, 'users', qrData.studentId));
        const studentData = studentDoc.data() as Student | undefined;

        await addDoc(collection(firestore, sessionAttendanceQuery.path), {
          studentId: qrData.studentId,
          subjectId: subject.id,
          timestamp: serverTimestamp(),
          status: 'present',
          recordedBy: adminUser.uid,
          date: new Date().toISOString().split('T')[0],
        });

        toast({
          title: 'Attendance Marked!',
          description: `${studentData?.firstName || 'Student'} ${
            studentData?.lastName || ''
          } marked as present.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid QR Code',
          description: result.reason || 'Could not validate attendance.',
        });
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast({
        variant: 'destructive',
        title: 'Scan Error',
        description: 'The scanned QR code is not valid for this system.',
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setScannedData(null);
      }, 2000); // 2-second cooldown
    }
  }, [
    scannedData,
    isProcessing,
    activeSession,
    adminUser,
    firestore,
    subject.id,
    toast,
    presentStudents,
    sessionAttendanceQuery,
  ]);

  useEffect(() => {
    processScan();
  }, [processScan]);

  const handleStartSession = async () => {
    if (activeSession) {
      toast({ title: 'Session already active.' });
      return;
    }
    const newSessionSecret = `secret-${subject.id}-${Date.now()}`;
    const sessionCollectionRef = collection(
      firestore,
      'subjects',
      subject.id,
      'attendanceSessions'
    );
    await addDoc(sessionCollectionRef, {
      subjectId: subject.id,
      startTime: serverTimestamp(),
      isActive: true,
      qrCodeSecret: newSessionSecret,
    });
    toast({
      title: 'Attendance Session Started',
      description: 'You can now start scanning student QR codes.',
    });
    refreshSessions();
    onRefresh();
  };

  const handleStopSession = async () => {
    if (!activeSession) {
      toast({ title: 'No active session to stop.' });
      return;
    }
    const sessionRef = doc(
      firestore,
      'subjects',
      subject.id,
      'attendanceSessions',
      activeSession.id
    );
    await updateDoc(sessionRef, { isActive: false, endTime: serverTimestamp() });
    toast({ title: 'Attendance Session Stopped' });
    onRefresh();
  };
  
  const isSessionActive = !!activeSession;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Attendance Scanner: {subject.name}</DialogTitle>
          <DialogDescription>
            {subject.code} ({subject.block})
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start h-full overflow-hidden">
          {/* Left Column: Scanner and Controls */}
          <div className="flex flex-col gap-4 h-full">
            <div className="aspect-video w-full rounded-lg border bg-background overflow-hidden relative">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />

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

            <div className="flex-shrink-0">
                {!isSessionActive ? (
                  <Button onClick={handleStartSession} className="w-full">
                    <PlayCircle className="mr-2 h-4 w-4" /> Start Session
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopSession}
                    variant="destructive"
                    className="w-full"
                  >
                    <StopCircle className="mr-2 h-4 w-4" /> Stop Session
                  </Button>
                )}
            </div>
             <Card className="flex-shrink-0">
                <CardHeader className="pb-4 flex flex-row items-center gap-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <p className="text-2xl font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-sm text-muted-foreground">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
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
