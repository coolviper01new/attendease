
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Subject, AttendanceSession as TAttendanceSession, Registration } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, QrCode, PlayCircle, Clock, Trash2, Camera, XCircle, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, updateDoc, writeBatch, collectionGroup, getDocs, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupBy } from "lodash";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { AttendanceScannerDialog } from "./attendance-scanner-dialog";
import { AttendanceListDialog } from "./attendance-list-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const SessionToggle = ({ subjectId, onRefresh }: { subjectId: string, onRefresh: () => void }) => {
  const firestore = useFirestore();
  const sessionsQuery = useMemoFirebase(() => 
    query(collection(firestore, 'subjects', subjectId, 'attendanceSessions'), where('isActive', '==', true))
  , [firestore, subjectId]);
  const { data: sessions, isLoading, forceRefresh } = useCollection<TAttendanceSession>(sessionsQuery);

  const activeSession = sessions?.[0];

  const handleToggle = async (checked: boolean) => {
    if (checked && !activeSession) {
      const newSessionSecret = `secret-${subjectId}-${Date.now()}`;
      const sessionCollectionRef = collection(firestore, 'subjects', subjectId, 'attendanceSessions');
      const sessionData = {
        subjectId: subjectId,
        startTime: serverTimestamp(),
        isActive: true,
        qrCodeSecret: newSessionSecret
      };
      addDoc(sessionCollectionRef, sessionData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sessionCollectionRef.path,
          operation: 'create',
          requestResourceData: sessionData,
        }));
      });
      forceRefresh();
      onRefresh();
    } else if (!checked && activeSession) {
      const sessionRef = doc(firestore, 'subjects', subjectId, 'attendanceSessions', activeSession.id);
      const sessionData = { isActive: false, endTime: serverTimestamp() };
      updateDoc(sessionRef, sessionData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sessionRef.path,
          operation: 'update',
          requestResourceData: sessionData,
        }));
      });
      forceRefresh();
      onRefresh();
    }
  };

  if (isLoading) {
    return <div className="flex items-center space-x-2">
      <Switch id={`session-${subjectId}`} disabled />
      <Label htmlFor={`session-${subjectId}`} className="text-xs text-muted-foreground">
        Loading...
      </Label>
    </div>
  }
  
  return (
    <div className="flex items-center space-x-2">
      <Switch id={`session-${subjectId}`} checked={!!activeSession} onCheckedChange={handleToggle} />
      <Label htmlFor={`session-${subjectId}`} className="text-xs text-muted-foreground">
        {activeSession ? "Active" : "Inactive"}
      </Label>
    </div>
  );
};

const EnrollmentQrCodeDialog = ({ subject }: { subject: Subject }) => {
  const enrollmentData = JSON.stringify({ type: 'enrollment', subjectId: subject.id });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(enrollmentData)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
          <QrCode className="mr-2 h-4 w-4" />
          <span>Enrollment QR</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enrollment QR Code for {subject.name} ({subject.block})</DialogTitle>
          <DialogDescription>
            Students can scan this code to enroll in this specific block.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4 bg-white rounded-lg">
            <Image
                src={qrCodeUrl}
                alt={`Enrollment QR Code for ${subject.name} (${subject.block})`}
                width={250}
                height={250}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EnrollmentStatusAction = ({ subject, onStatusChange }: { subject: Subject; onStatusChange: () => void }) => {
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isEnrollmentOpen = subject.enrollmentStatus === 'open';

    const handleToggleEnrollment = async () => {
        setIsSubmitting(true);
        const newStatus = isEnrollmentOpen ? 'closed' : 'open';
        const subjectRef = doc(firestore, 'subjects', subject.id);
        const subjectData = { enrollmentStatus: newStatus };

        updateDoc(subjectRef, subjectData).then(() => {
            onStatusChange();
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: subjectRef.path,
                operation: 'update',
                requestResourceData: subjectData,
            }));
        }).finally(() => {
            setIsSubmitting(false);
        });
    };

    const dialogDetails = isEnrollmentOpen ? {
        triggerIcon: XCircle,
        triggerText: "Close Enrollment",
        title: "Are you sure you want to close enrollment?",
        description: `This will prevent any new students from enrolling in ${subject.name} (${subject.block}). Existing students will not be affected.`,
        actionText: "Confirm & Close",
        triggerClassName: "text-destructive focus:bg-destructive/90 focus:text-destructive-foreground"
    } : {
        triggerIcon: PlayCircle,
        triggerText: "Start Enrollment",
        title: "Are you sure you want to start enrollment?",
        description: `This will open enrollment for ${subject.name} (${subject.block}). You will no longer be able to edit the subject code or block name after this.`,
        actionText: "Confirm & Start",
        triggerClassName: ""
    };


    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <div 
                  className={`relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${dialogDetails.triggerClassName}`}
                >
                    <dialogDetails.triggerIcon className="mr-2 h-4 w-4" />
                    <span>{dialogDetails.triggerText}</span>
                </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{dialogDetails.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                       {dialogDetails.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleEnrollment} disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : dialogDetails.actionText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const DeleteSubjectAction = ({ subject, onDeleted }: { subject: Subject; onDeleted: () => void }) => {
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertInfo, setAlertInfo] = useState<{title: string, description: string} | null>(null);

    const handleDelete = async () => {
        setIsSubmitting(true);
        setAlertInfo(null);
        try {
            const registrationsQuery = query(collectionGroup(firestore, 'registrations'), where('subjectId', '==', subject.id));
            const registrationsSnapshot = await getDocs(registrationsQuery);

            if (!registrationsSnapshot.empty) {
                setAlertInfo({
                    title: 'Deletion Failed',
                    description: `Cannot delete ${subject.name} (${subject.block}). At least one student is enrolled.`,
                });
                setIsSubmitting(false);
                return;
            }

            const subjectRef = doc(firestore, 'subjects', subject.id);
            await deleteDoc(subjectRef);
            
            onDeleted();

        } catch (error) {
            const subjectRef = doc(firestore, 'subjects', subject.id);
            const permissionError = new FirestorePermissionError({
                path: subjectRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors focus:bg-destructive focus:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Subject</span>
                </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the subject <span className="font-bold">{subject.name} ({subject.block})</span>. This action cannot be undone and will only succeed if no students are enrolled.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {alertInfo && (
                    <Alert variant="destructive">
                        <AlertTitle>{alertInfo.title}</AlertTitle>
                        <AlertDescription>{alertInfo.description}</AlertDescription>
                    </Alert>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleDelete} disabled={isSubmitting}>
                        {isSubmitting ? 'Deleting...' : 'Confirm & Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


type GetColumnsProps = {
  onEdit: (subject: Subject) => void;
  onRefresh: () => void;
}


const ActionsCell = ({ row, onEdit, onRefresh }: { row: any, onEdit: (subject: Subject) => void, onRefresh: () => void }) => {
    const subject = row.original as Subject;
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isAttendanceListOpen, setIsAttendanceListOpen] = useState(false);
    
    if (row.getIsGrouped()) {
        return null; 
    }

    return (
      <>
        <AttendanceScannerDialog 
          subject={subject}
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          onRefresh={onRefresh}
        />
        <AttendanceListDialog 
            subject={subject}
            open={isAttendanceListOpen}
            onOpenChange={setIsAttendanceListOpen}
        />
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{subject.name} ({subject.block})</DropdownMenuLabel>
              <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onEdit(subject)}>Edit Details</DropdownMenuItem>
                  <EnrollmentStatusAction subject={subject} onStatusChange={onRefresh} />
                  <EnrollmentQrCodeDialog subject={subject} />
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsScannerOpen(true)}>
                <Camera className="mr-2 h-4 w-4" />
                Open Attendance Scanner
              </DropdownMenuItem>
               <DropdownMenuItem onClick={() => setIsAttendanceListOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                View Attendance List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteSubjectAction subject={subject} onDeleted={onRefresh} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    );
};

export const getColumns = ({ onEdit, onRefresh }: GetColumnsProps): ColumnDef<Subject>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Subject
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="pl-4">
        {row.getIsGrouped() ? (
          <div className="font-bold">{row.getValue("name")}</div>
        ) : (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        )}
      </div>
    ),
    sortingFn: 'text',
    enableHiding: false,
  },
  {
    accessorKey: "block",
    header: "Block",
    cell: ({ row }) => {
      if (row.getIsGrouped()) {
        return null;
      }
      return <Badge variant="outline">{row.original.block}</Badge>
    },
  },
  {
      id: "schedules",
      header: "Schedule",
      cell: ({row}) => {
        if (row.getIsGrouped()) return null;
        const { lectureSchedules, labSchedules, hasLab } = row.original;
        if (!lectureSchedules || lectureSchedules.length === 0) return <span className="text-xs text-muted-foreground">Not set</span>;
        
        return (
            <div className="text-xs flex flex-col gap-2">
                {lectureSchedules && lectureSchedules.length > 0 && (
                    <div>
                        <p className="font-semibold mb-1">Lecture</p>
                        {lectureSchedules.map((s, i) => (
                            <div key={`lec-${i}`} className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{s.day}, {s.startTime}-{s.endTime} @ {s.room}</span>
                            </div>
                        ))}
                    </div>
                )}
                {hasLab && labSchedules && labSchedules.length > 0 && (
                    <div>
                        <p className="font-semibold mt-1 mb-1">Laboratory</p>
                        {labSchedules.map((s, i) => (
                            <div key={`lab-${i}`} className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{s.day}, {s.startTime}-{s.endTime} @ {s.room}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
      }
  },
    {
    accessorKey: "credits",
    header: () => <div className="text-center">Credits</div>,
    cell: ({row}) => {
        if (row.getIsGrouped()) return null;
        return <div className="text-center">{row.original.credits}</div>
    }
  },
  {
    id: "enrollmentStatus",
    header: "Enrollment",
    cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        const status = row.original.enrollmentStatus;
        return (
            <Badge variant={status === 'open' ? 'default' : 'secondary'}
                className={status === 'open' ? 'bg-green-500/20 text-green-600' : ''}
            >
                {status}
            </Badge>
        )
    }
  },
  {
    id: "sessionStatus",
    header: "Session Status",
    cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        return <SessionToggle subjectId={row.original.id} onRefresh={onRefresh} />
    },
  },
  {
    id: "actions",
    cell: (props) => <ActionsCell {...props} onEdit={onEdit} onRefresh={onRefresh} />,
  },
];
