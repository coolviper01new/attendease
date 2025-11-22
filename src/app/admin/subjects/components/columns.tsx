"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Subject } from "@/lib/types";
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
import { mockAttendanceSessions } from "@/lib/data";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const SessionToggle = ({ subjectId }: { subjectId: string }) => {
  const session = mockAttendanceSessions.find(s => s.subjectId === subjectId);
  // In a real app, you'd use a server action to update the state.
  return (
    <div className="flex items-center space-x-2">
      <Switch id={`session-${subjectId}`} defaultChecked={session?.isActive} />
      <Label htmlFor={`session-${subjectId}`} className="text-xs text-muted-foreground">
        {session?.isActive ? "Active" : "Inactive"}
      </Label>
    </div>
  );
};

export const columns: ColumnDef<Subject>[] = [
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
      </div>
    ),
  },
  {
    accessorKey: "schedule",
    header: "Schedule",
    cell: ({ row }) => {
      const { day, startTime, endTime, room } = row.original.schedule;
      return (
        <div>
          <div>{day}</div>
          <div className="text-xs text-muted-foreground">{`${startTime} - ${endTime} | ${room}`}</div>
        </div>
      );
    },
  },
   {
    accessorKey: "blockId",
    header: "Block",
     cell: ({ row }) => <Badge variant="secondary">{row.original.blockId.toLocaleUpperCase()}</Badge>,
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
              <DropdownMenuItem>Edit Subject</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete Subject</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
