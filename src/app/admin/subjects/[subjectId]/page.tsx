
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
import { doc, collection, query, where, getDocs, collectionGroup, addDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import type { Subject, User, Student, Registration, AttendanceSession, Attendance } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { validateAttendance } from "@/ai/flows/attendance-validator";
import QrScanner from 'qr-scanner';
import { Separator } from "@/components/ui/separator";


export default function SubjectAttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Unified Data State ---
  const [isLoading, setIsLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [presentStudents, setPresentStudents] = useState<(Student & {id: string})[]>([]);

  // --- Data Fetching Hooks ---
  const activeSessionQuery = useMemoFirebase(() => 
    subjectId ? query(collection(firestore, 'subjects', subjectId, 'attendanceSessions'), where('isActive', '==', true)) : null
  , [firestore, subjectId]);
  const { data: activeSessions } = useCollection<AttendanceSession>(activeSessionQuery);
  const activeSession = activeSessions?.[0];
  
  const sessionAttendanceQuery = useMemoFirebase(() => {
    if (!activeSession) return null;
    return collection(firestore, `subjects/${subjectId}/attendanceSessions/${activeSession.id}/attendance`);
  }, [firestore, subjectId, activeSession]);
  const { data: attendanceRecords } = useCollection<Attendance>(sessionAttendanceQuery);
  
  // --- Main Data Fetching and Student Details Effect ---
  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      if (!subjectId) return;

      setIsLoading(true);

      try {
        // 1. Fetch Subject
        const subjectDocRef = doc(firestore, 'subjects', subjectId);
        const subjectSnapshot = await getDoc(subjectDocRef);
       
        if (!isMounted) return;

        if (!subjectSnapshot.exists()) {
          setSubject(null);
          setIsLoading(false);
          return;
        }
        const subjectData = { id: subjectSnapshot.id, ...subjectSnapshot.data() } as Subject;
        setSubject(subjectData);

      } catch (error) {
        console.error("Error fetching subject data:", error);
        setSubject(null);
      } finally {
        if(isMounted) {
            // We set loading to false in the subsequent effect
        }
      }
    };

    fetchAllData();

    return () => {
      isMounted = false;
    }
  }, [subjectId, firestore]);
  
  // Effect to fetch student details for those present
  useEffect(() => {
      let isMounted = true;
      const fetchStudentDetails = async () => {
          if (attendanceRecords && subject) { // only run if attendanceRecords has been loaded and subject is present
            if (attendanceRecords.length === 0) {
              if (isMounted) setPresentStudents([]);
              setIsLoading(false); // Stop loading if subject is loaded but no one is present
              return;
            }

              const studentIds = attendanceRecords.map(att => att.studentId);
              if (studentIds.length === 0) {
                if (isMounted) setPresentStudents([]);
                setIsLoading(false);
                return;
              };

              const studentChunks = [];
              for (let i = 0; i < studentIds.length; i += 30) {
                  studentChunks.push(studentIds.slice(i, i + 30));
              }

              try {
                const studentPromises = studentChunks.map(chunk => 
                    getDocs(query(collection(firestore, 'users'), where('__name__', 'in', chunk)))
                );
                const studentSnapshots = await Promise.all(studentPromises);
                if (!isMounted) return;

                const studentsData = studentSnapshots.flatMap(snapshot => 
                    snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student & {id: string}))
                );
                setPresentStudents(studentsData);
              } catch(e) {
                console.error("Error fetching student details:", e);
                setPresentStudents([]);
              } finally {
                if(isMounted) setIsLoading(false);
              }
          } else if (subject) { // if attendance records are null/undefined but we have a subject
              if (isMounted) setPresentStudents([]);
              setIsLoading(false); // Stop loading
          }
      };

      if (subject) { // Only run this if we have a subject
        fetchStudentDetails();
      }

      return () => {
        isMounted = false;
      }
  }, [attendanceRecords, firestore, subject]);


  // --- Camera and QR Scanner Effects ---
  useEffect(() => {
    let isMounted = true;
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        if (isMounted) {
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this feature.',
          });
        }
      }
    };
    getCameraPermission();
    return () => { isMounted = false; };
  }, [toast]);

  useEffect(() => {
    if (!videoRef.current || !hasCameraPermission) return;
    let isMounted = true;
    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (isMounted && result.data && result.data !== scannedData) {
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
      isMounted = false;
      qrScanner.stop();
      qrScanner.destroy();
    };
  }, [hasCameraPermission, scannedData]);

  // --- Attendance Processing Effect ---
  useEffect(() => {
    let isMounted = true;
    const processScan = async () => {
      if (!scannedData || isProcessing || !activeSession) return;

      setIsProcessing(true);
      
      try {
        const qrData = JSON.parse(scannedData);
        
        // Prevent re-scanning the same student in the same session
        if (attendanceRecords?.some(att => att.studentId === qrData.studentId)) {
          toast({ variant: 'destructive', title: 'Already Marked', description: 'This student has already been marked present for this session.' });
          if(isMounted) {
            setScannedData(null);
            setIsProcessing(false);
          }
          return;
        }

        const studentDoc = await getDoc(doc(firestore, 'users', qrData.studentId));
        const isRegistered = studentDoc.exists();

        const validationInput = {
          qrCodeData: scannedData,
          subjectId: subjectId,
          studentId: qrData.studentId,
          qrCodeSecret: activeSession.qrCodeSecret,
          attendanceSessionActive: activeSession.isActive,
          studentRegistered: isRegistered
        };

        const result = await validateAttendance(validationInput);
        if (!isMounted) return;

        if (result.isValid) {
          if (sessionAttendanceQuery) {
            await addDoc(sessionAttendanceQuery, {
              studentId: qrData.studentId,
              subjectId: subjectId,
              timestamp: serverTimestamp(),
              status: 'present',
              recordedBy: 'admin',
              date: new Date().toISOString().split('T')[0],
            });
            toast({
                title: "Attendance Marked!",
                description: `${studentDoc.data()?.firstName} ${studentDoc.data()?.lastName} marked as present.`,
            });
          }
        } else {
            toast({ variant: 'destructive', title: 'Invalid QR Code', description: result.reason || 'Could not validate attendance.' });
        }

      } catch (error) {
        console.error('Error processing QR code:', error);
        toast({ variant: 'destructive', title: 'Scan Error', description: 'The scanned QR code is not valid for this system.' });
      } finally {
        setTimeout(() => {
          if(isMounted) {
            setScannedData(null);
            setIsProcessing(false);
          }
        }, 2000);
      }
    };
    
    processScan();
    
    return () => { isMounted = false; }
  }, [scannedData, isProcessing, activeSession, subjectId, firestore, toast, attendanceRecords, sessionAttendanceQuery]);
  
  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  if (isLoading) {
    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <Skeleton className="h-96 w-full" />
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    )
  }
  
  if (!subject) {
    notFound();
  }
  
  const isSessionActive = !!activeSession;

  return (
    <>
      <PageHeader
        title={subject.name}
        description={`Attendance for ${subject.code} (${subject.block})`}
      >
        {!isSessionActive ? (
          <Button onClick={handleStartSession} size="sm">
            <PlayCircle className="mr-2 h-4 w-4" /> Start Session
          </Button>
        ) : (
          <Button onClick={handleStopSession} variant="destructive" size="sm">
            <StopCircle className="mr-2 h-4 w-4" /> Stop Session
          </Button>
        )}
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="lg:sticky top-20">
          <CardHeader>
            <CardTitle>QR Code Scanner</CardTitle>
            <CardDescription>The camera will activate when a session is started.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg border bg-background overflow-hidden relative">
              <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
              
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                  <Alert variant="destructive">
                      <AlertTitle>Camera Access Required</AlertTitle>
                      <AlertDescription>
                        Please allow camera access to use this feature.
                      </AlertDescription>
                  </Alert>
                </div>
              )}
               {!isSessionActive && (
                 <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4">
                    <div className="text-center">
                        <p className="font-semibold">Session Inactive</p>
                        <p className="text-sm text-muted-foreground">Click "Start Session" to begin scanning.</p>
                    </div>
                 </div>
               )}
              {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <p className="text-white text-lg animate-pulse">Processing...</p>
                  </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card>
                <CardHeader className="pb-4 flex flex-row items-center gap-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <p className="text-2xl font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-sm text-muted-foreground">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Present Students ({presentStudents.length})
                    </CardTitle>
                    <CardDescription>
                        {isSessionActive ? "Students will appear here as they scan in." : "Start a session to view attendance."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[calc(100vh-28rem)] overflow-y-auto">
                    {presentStudents.length > 0 ? (
                        <div className="space-y-4">
                            {presentStudents.map(student => (
                                <div key={student.id} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={student.avatarUrl} />
                                        <AvatarFallback>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-8">{isSessionActive ? "No students have checked in yet." : "No active session."}</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

    