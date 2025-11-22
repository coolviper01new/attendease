"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { getStudentSubjects, mockStudents } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Clock, BookOpen, AlertTriangle } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/lib/types";

const student = mockStudents[0];
const subjects = getStudentSubjects(student.id);

const QrCodeDialog = ({ studentId, subjectId, isDeviceRegistered, isCurrentDevice }: { studentId: string, subjectId: string, isDeviceRegistered: boolean, isCurrentDevice: boolean }) => {
    const { toast } = useToast();
    
    if (!isDeviceRegistered) {
        return (
            <Button onClick={() => {
                // In a real app, this would be a server action to register the device.
                console.log("Registering device...");
                localStorage.setItem("deviceId", "device-alice-123");
                toast({
                    title: "Device Registered",
                    description: "This device has been successfully registered for QR code generation.",
                });
                // This would typically trigger a re-render with the new state.
                window.location.reload(); 
            }}>
                Register This Device
            </Button>
        );
    }
    
    if (!isCurrentDevice) {
        return (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Device Not Registered</AlertTitle>
              <AlertDescription>
                You can only generate QR codes from your registered device. Please contact an admin if you need to change it.
              </AlertDescription>
            </Alert>
        );
    }
    
    const qrCodeSecret = "supersecretkey";
    const qrData = JSON.stringify({ studentId, subjectId, qrCodeSecret });
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <QrCode className="mr-2 h-4 w-4" /> View QR Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Your Attendance QR Code</DialogTitle>
                    <DialogDescription>
                        Present this to the administrator for attendance marking. This code is unique to you and this subject.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                    <Image src={qrCodeUrl} alt="Attendance QR Code" width={250} height={250} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function StudentDashboardPage() {
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const deviceId = localStorage.getItem("deviceId");
    setCurrentDeviceId(deviceId);
  }, []);

  const isDeviceRegistered = !!student.deviceId;
  const isCurrentDevice = isDeviceRegistered && student.deviceId === currentDeviceId;
  
  return (
    <>
      <PageHeader
        title="My Subjects"
        description="Here are the subjects you are enrolled in."
      />

      {isClient && !isDeviceRegistered && (
        <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <AlertTriangle className="h-4 w-4 !text-blue-800" />
            <AlertTitle>Device Registration Required</AlertTitle>
            <AlertDescription>
                To generate QR codes for attendance, you must register your primary device. This is a one-time action.
            </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Card key={subject.id} className="flex flex-col">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="font-headline text-xl mb-1">{subject.name}</CardTitle>
                        <CardDescription>{subject.code}</CardDescription>
                    </div>
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>
                  {subject.schedule.day}, {subject.schedule.startTime} - {subject.schedule.endTime}
                </span>
              </div>
               <p className="text-sm text-muted-foreground mt-1">
                Room: {subject.schedule.room}
               </p>
            </CardContent>
            <CardFooter>
              {!isClient ? null : (
                  <QrCodeDialog 
                    studentId={student.id} 
                    subjectId={subject.id} 
                    isDeviceRegistered={isDeviceRegistered} 
                    isCurrentDevice={isCurrentDevice}
                  />
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
