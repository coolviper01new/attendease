
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CameraOff, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import type { Subject, Registration, Student } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';

export default function ScanEnrollmentPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; description: string; variant: 'default' | 'destructive' | 'success' } | null>(null);

  const registrationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'registrations'));
  }, [firestore, user]);
  const { data: userRegistrations } = useCollection<Registration>(registrationsQuery);

  const startScanner = useCallback(() => {
     if (videoRef.current && hasCameraPermission && !qrScannerRef.current) {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!isProcessing) {
             setScannedData(result.data);
          }
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
  }, [hasCameraPermission, isProcessing]);
  
  // --- Camera and QR Scanner Effects ---
  useEffect(() => {
    const getCameraPermission = async () => {
      if (hasCameraPermission === null) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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

    return () => {
      qrScannerRef.current?.stop();
      qrScannerRef.current?.destroy();
      qrScannerRef.current = null;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [hasCameraPermission]);

  useEffect(() => {
    if(hasCameraPermission){
        startScanner();
    }
  }, [hasCameraPermission, startScanner]);

  const processScan = useCallback(async () => {
    if (!scannedData || isProcessing || !user) return;

    setIsProcessing(true);
    setAlertInfo(null);
    qrScannerRef.current?.stop();


    try {
      const qrData = JSON.parse(scannedData);

      if (qrData.type !== 'enrollment' || !qrData.subjectId) {
        setAlertInfo({
          title: 'Invalid QR Code',
          description: 'This is not a valid subject enrollment QR code.',
          variant: 'destructive',
        });
        return;
      }

      const isAlreadyEnrolled = userRegistrations?.some(reg => reg.subjectId === qrData.subjectId);

      if(isAlreadyEnrolled){
        setAlertInfo({
            title: 'Already Enrolled',
            description: 'You are already enrolled in this subject.',
            variant: 'destructive',
        });
        return;
      }

      const subjectRef = doc(firestore, 'subjects', qrData.subjectId);
      const subjectSnap = await getDoc(subjectRef);

      if (!subjectSnap.exists()) {
        setAlertInfo({
          title: 'Subject Not Found',
          description: 'The subject associated with this QR code could not be found.',
          variant: 'destructive',
        });
        return;
      }
      
      const subjectData = subjectSnap.data() as Subject;

      if(subjectData.enrollmentStatus !== 'open') {
        setAlertInfo({
          title: 'Enrollment Closed',
          description: `Enrollment for ${subjectData.name} is currently closed.`,
          variant: 'destructive',
        });
        return;
      }

      const registrationData = {
        studentId: user.uid,
        subjectId: qrData.subjectId,
        blockId: subjectData.block,
        registrationDate: serverTimestamp(),
      };
      const registrationRef = collection(firestore, 'users', user.uid, 'registrations');

      await addDoc(registrationRef, registrationData);

      setAlertInfo({
        title: 'Enrollment Successful!',
        description: `You have been enrolled in ${subjectData.name} (${subjectData.block}). Redirecting to dashboard...`,
        variant: 'success',
      });

      setTimeout(() => {
        router.push('/student/dashboard');
      }, 3000);


    } catch (error) {
      console.error('QR Scan Processing Error:', error);
      setAlertInfo({
        title: 'Scan Error',
        description: 'Could not process the QR code. Please ensure it is a valid enrollment code and try again.',
        variant: 'destructive',
      });
      // Potentially emit a firestore permission error if that's the cause
      if((error as any).code?.startsWith('permission-denied')) {
        const regCollectionRef = collection(firestore, 'users', user.uid, 'registrations');
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: regCollectionRef.path,
            operation: 'create'
        }))
      }
    } finally {
        if(!alertInfo || alertInfo.variant !== 'success') {
            setTimeout(() => {
                setIsProcessing(false);
                setScannedData(null);
                startScanner();
            }, 3000)
        }
    }
  }, [scannedData, isProcessing, user, firestore, userRegistrations, router, startScanner, alertInfo]);
  
  useEffect(() => {
    if(scannedData){
        processScan();
    }
  }, [scannedData, processScan]);


  return (
    <>
      <PageHeader
        title="Scan Enrollment QR Code"
        description="Scan the QR code provided by your instructor to enroll in a subject."
      />
      <Card>
        <CardContent className="pt-6">
          <div className="aspect-video w-full max-w-lg mx-auto rounded-lg border bg-background overflow-hidden relative flex items-center justify-center">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
                <CameraOff className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-bold text-white">Camera Access Required</h3>
                <p className="text-muted-foreground">Please enable camera permissions in your browser to scan QR codes.</p>
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
          <div className="mt-6 max-w-lg mx-auto">
             {alertInfo && (
                <Alert variant={alertInfo.variant === 'success' ? 'default' : alertInfo.variant}>
                    {alertInfo.variant === 'destructive' && <AlertTriangle className="h-4 w-4" />}
                    {alertInfo.variant === 'success' && <CheckCircle className="h-4 w-4" />}
                    <AlertTitle>{alertInfo.title}</AlertTitle>
                    <AlertDescription>{alertInfo.description}</AlertDescription>
                </Alert>
             )}
              {!alertInfo && (
                <Alert variant="default" className="text-center">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Ready to Scan</AlertTitle>
                    <AlertDescription>
                        Position the QR code within the frame.
                    </AlertDescription>
                </Alert>
              )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
