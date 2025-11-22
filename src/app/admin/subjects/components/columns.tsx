
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
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { doc } from "firebase/firestore";
import { updateDoc } from "firebase/firestore";

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

type GetColumnsProps = {
  onEdit: (subject: Subject) => void;
}

export const getColumns = ({ onEdit }: GetColumnsProps): ColumnDef<Subject>[] => [
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
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
            {row.original.schedules.map(s => (
                <span key={s.day}>{s.day} {s.startTime}-{s.endTime} ({s.room})</span>
            ))}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "schoolYearName",
    header: "School Year",
  },
  {
    accessorKey: "yearLevelName",
    header: "Year Level",
  },
   {
    accessorKey: "block",
    header: "Block",
     cell: ({ row }) => <Badge variant="outline">{row.original.block}</Badge>,
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
              <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">Delete Subject</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
