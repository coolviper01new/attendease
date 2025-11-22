

"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Subject, AttendanceSession as TAttendanceSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, QrCode } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { doc } from "firebase/firestore";
import { updateDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupBy } from "lodash";

const SessionToggle = ({ subjectId }: { subjectId: string }) => {
  const firestore = useFirestore();
  const sessionsQuery = useMemoFirebase(() => 
    query(collection(firestore, 'subjects', subjectId, 'attendanceSessions'), where('isActive', '==', true))
  , [firestore, subjectId]);
  const { data: sessions, isLoading } = useCollection<TAttendanceSession>(sessionsQuery);

  const activeSession = sessions?.[0];

  const handleToggle = async (checked: boolean) => {
    // This is a simplified logic. A real app would need a more robust way
    // to handle session creation and deactivation.
    if (checked && !activeSession) {
      // Create a new session (logic to be implemented, maybe in a server action)
      console.log(`Starting session for ${subjectId}`);
    } else if (!checked && activeSession) {
      // Deactivate the current session
      const sessionRef = doc(firestore, 'subjects', subjectId, 'attendanceSessions', activeSession.id);
      await updateDoc(sessionRef, { isActive: false });
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

const EnrollmentQrCodeDialog = ({ subject, allSubjects }: { subject: Subject; allSubjects: Subject[] }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subject.id);

  // Group all subjects by code to find related blocks
  const groupedSubjects = useMemo(() => groupBy(allSubjects, 'code'), [allSubjects]);
  const relatedBlocks = groupedSubjects[subject.code] || [];

  const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId) || subject;
  
  const enrollmentData = JSON.stringify({ type: 'enrollment', subjectId: selectedSubject.id });
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
          <DialogTitle>Enrollment QR Code</DialogTitle>
          <DialogDescription>
            Generate a QR code for a specific block of {subject.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="block-select">Select Block</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger id="block-select">
                        <SelectValue placeholder="Select a block..." />
                    </SelectTrigger>
                    <SelectContent>
                        {relatedBlocks.map(blockSubject => (
                            <SelectItem key={blockSubject.id} value={blockSubject.id}>
                                {blockSubject.block}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                <Image
                    src={qrCodeUrl}
                    alt={`Enrollment QR Code for ${selectedSubject.name} (${selectedSubject.block})`}
                    width={250}
                    height={250}
                />
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

type GetColumnsProps = {
  onEdit: (subject: Subject) => void;
  allSubjects: Subject[];
}

export const getColumns = ({ onEdit, allSubjects }: GetColumnsProps): ColumnDef<Subject>[] => [
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
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.code}</div>
        <div className="text-xs text-muted-foreground truncate max-w-xs">{row.original.description}</div>
      </div>
    ),
  },
  {
    accessorKey: "schoolYear",
    header: "School Year",
  },
  {
    accessorKey: "yearLevel",
    header: "Year Level",
     cell: ({ row }) => <span>{row.original.yearLevel} Year</span>
  },
   {
    accessorKey: "block",
    header: "Block",
     cell: ({ row }) => <Badge variant="outline">{row.original.block}</Badge>,
  },
  {
      accessorKey: "schedules",
      header: "Schedule",
      cell: ({row}) => (
        <div className="text-xs flex flex-col gap-1">
            {row.original.schedules.map(s => (
                <span key={s.day}>{s.day}, {s.startTime}-{s.endTime} @ {s.room}</span>
            ))}
        </div>
      )
  },
  {
    id: "sessionStatus",
    header: "Session Status",
    cell: ({ row }) => <SessionToggle subjectId={row.original.id} />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const subject = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/admin/subjects/${subject.id}`}>Take Attendance</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(subject)}>Edit Subject</DropdownMenuItem>
              <DropdownMenuSeparator />
              <EnrollmentQrCodeDialog subject={subject} allSubjects={allSubjects} />
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">Delete Subject</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
