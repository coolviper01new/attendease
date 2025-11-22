'use client';
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QrCode, StopCircle, Clock, PlayCircle, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, getDocs, collectionGroup, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Subject, User, Student, Registration, AttendanceSession, Attendance } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { validateAttendance } from "@/ai/flows/attendance-validator";

// A library to decode QR codes from a video stream
import QrScanner from 'qr-scanner';


export default function SubjectAttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Data Fetching ---
  const subjectDocRef = useMemoFirebase(() => doc(firestore, 'subjects', subjectId), [firestore, subjectId]);
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const activeSessionQuery = useMemoFirebase(() => 
    query(collection(firestore, 'subjects', subjectId, 'attendanceSessions'), where('isActive', '==', true))
  , [firestore, subjectId]);
  const { data: activeSessions, isLoading: isSessionLoading } = useCollection<AttendanceSession>(activeSessionQuery);
  const activeSession = activeSessions?.[0];

  const sessionAttendanceQuery = useMemoFirebase(() => {
    if (!activeSession) return null;
    return collection(firestore, `subjects/${subjectId}/attendanceSessions/${activeSession.id}/attendance`);
  }, [firestore, subjectId, activeSession]);
  const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<Attendance>(sessionAttendanceQuery);
  
  const [presentStudents, setPresentStudents] = useState<(Student & {id: string})[]>([]);

  useEffect(() => {
      const fetchStudentDetails = async () => {
          if (attendanceRecords && attendanceRecords.length > 0) {
              const studentIds = attendanceRecords.map(att => att.studentId);
              if (studentIds.length === 0) {
                setPresentStudents([]);
                return;
              };

              const studentChunks = [];
              for (let i = 0; i < studentIds.length; i += 10) {
                  studentChunks.push(studentIds.slice(i, i + 10));
              }

              const studentPromises = studentChunks.map(chunk => 
                  getDocs(query(collection(firestore, 'users'), where('__name__', 'in', chunk)))
              );
              const studentSnapshots = await Promise.all(studentPromises);
              const studentsData = studentSnapshots.flatMap(snapshot => 
                  snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student & {id: string}))
              );
              setPresentStudents(studentsData);
          } else {
              setPresentStudents([]);
          }
      };

      fetchStudentDetails();
  }, [attendanceRecords, firestore]);
  

  // --- Camera and QR Scanner Effects ---
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    getCameraPermission();
  }, [toast]);

  useEffect(() => {
    if (!videoRef.current || !hasCameraPermission) return;

    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (result.data && result.data !== scannedData) {
          setScannedData(result.data);
        }
      },
      { 
        onDecodeError: () => {}, // Keep it silent on errors
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );
    qrScanner.start();

    return () => {
      qrScanner.stop();
      qrScanner.destroy();
    };
  }, [hasCameraPermission, scannedData]);

  // --- Attendance Processing Effect ---
  useEffect(() => {
    const processScan = async () => {
      if (!scannedData || isProcessing || !activeSession) return;

      setIsProcessing(true);
      
      try {
        const qrData = JSON.parse(scannedData);
        
        // Prevent re-scanning the same student in the same session
        if (attendanceRecords?.some(att => att.studentId === qrData.studentId)) {
          toast({ variant: 'destructive', title: 'Already Marked', description: 'This student has already been marked present for this session.' });
          setScannedData(null);
          setIsProcessing(false);
          return;
        }

        const studentDoc = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', qrData.studentId)));
        const isRegistered = studentDoc.docs.length > 0;

        const validationInput = {
          qrCodeData: scannedData,
          subjectId: subjectId,
          studentId: qrData.studentId,
          qrCodeSecret: activeSession.qrCodeSecret,
          attendanceSessionActive: activeSession.isActive,
          studentRegistered: isRegistered
        };

        const result = await validateAttendance(validationInput);

        if (result.isValid) {
          // Record attendance in Firestore
          if (sessionAttendanceQuery) {
            await addDoc(sessionAttendanceQuery, {
              studentId: qrData.studentId,
              subjectId: subjectId,
              timestamp: serverTimestamp(),
              status: 'present',
              recordedBy: 'admin', // Placeholder
              date: new Date().toISOString().split('T')[0],
            });
            toast({
                title: "Attendance Marked!",
                description: `Student successfully marked as present.`,
            });
          }
        } else {
            toast({ variant: 'destructive', title: 'Invalid QR Code', description: result.reason || 'Could not validate attendance.' });
        }

      } catch (error) {
        console.error('Error processing QR code:', error);
        toast({ variant: 'destructive', title: 'Scan Error', description: 'The scanned QR code is not valid for this system.' });
      } finally {
        // Reset after a delay to prevent immediate re-scans of the same code
        setTimeout(() => {
          setScannedData(null);
          setIsProcessing(false);
        }, 2000);
      }
    };
    
    processScan();
  }, [scannedData, isProcessing, activeSession, subjectId, firestore, toast, attendanceRecords, sessionAttendanceQuery]);


  // --- Session Management Handlers ---
  const handleStartSession = async () => {
    if (activeSession) {
      toast({ title: "Session already active." });
      return;
    }
    const newSessionSecret = `secret-${subjectId}-${Date.now()}`;
    const sessionCollectionRef = collection(firestore, 'subjects', subjectId, 'attendanceSessions');
    await addDoc(sessionCollectionRef, {
      subjectId: subjectId,
      startTime: serverTimestamp(),
      isActive: true,
      qrCodeSecret: newSessionSecret
    });
    toast({ title: "Attendance Session Started", description: "You can now start scanning student QR codes." });
  };

  const handleStopSession = async () => {
    if (!activeSession) {
      toast({ title: "No active session to stop." });
      return;
    }
    const sessionRef = doc(firestore, 'subjects', subjectId, 'attendanceSessions', activeSession.id);
    await updateDoc(sessionRef, { isActive: false, endTime: serverTimestamp() });
    toast({ title: "Attendance Session Stopped" });
  };

  const isLoading = isSubjectLoading || isSessionLoading;

  if (isLoading) {
    return (
        <div className="container p-6">
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3 mb-6" />
        </div>
    )
  }

  if (!subject) {
    notFound();
  }
  
  const isSessionActive = !!activeSession;

  return (
    <>
      <div className="relative h-[calc(100vh-12rem)] w-full overflow-hidden rounded-lg border bg-background">
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
        
        {hasCameraPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Alert variant="destructive" className="max-w-sm">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature. Check your browser settings.
                </AlertDescription>
            </Alert>
          </div>
        )}

        {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-lg">Processing...</p>
            </div>
        )}

        {/* --- OVERLAYS --- */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <Card className="max-w-md bg-card/80 backdrop-blur-sm">
                <CardHeader className="p-4">
                    <CardTitle>{subject.name}</CardTitle>
                    <CardDescription>{subject.code} ({subject.block})</CardDescription>
                </CardHeader>
            </Card>
            {!isSessionActive ? (
                <Button onClick={handleStartSession} size="lg">
                    <PlayCircle className="mr-2 h-5 w-5" /> Start Session
                </Button>
            ) : (
                <Button onClick={handleStopSession} variant="destructive" size="lg">
                    <StopCircle className="mr-2 h-5 w-5" /> Stop Session
                </Button>
            )}
        </div>
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-4">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader className="p-4 flex flex-row items-center gap-4">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <CardTitle className="text-xl font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</CardTitle>
                        <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                    </div>
                </CardHeader>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm max-h-64 w-96">
                <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Present Students ({presentStudents.length})
                    </CardTitle>
                    <CardDescription>
                        {isSessionActive ? "Students will appear here as they scan in." : "Start a session to see attendance."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 overflow-y-auto">
                    {isAttendanceLoading ? <p>Loading...</p> : presentStudents.length > 0 ? (
                        <div className="space-y-2">
                            {presentStudents.map(student => (
                                <div key={student.id} className="flex items-center gap-3 text-sm">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={student.avatarUrl} />
                                        <AvatarFallback>{student.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{student.firstName} {student.lastName}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">{isSessionActive ? "No students have checked in yet." : "No active session."}</p>
                    )}
                </CardContent>
            </Card>

        </div>
      </div>
    </>
  );
}
