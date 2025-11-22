
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, SmartphoneNfc } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const ActionsCell = ({ row }: { row: any }) => {
    const student = row.original as Student;
    const firestore = useFirestore();

    const handleRemoveDevice = async () => {
        if (!student.deviceId) return;

        const studentDocRef = doc(firestore, 'users', student.id);
        const updateData = { deviceId: null };

        updateDoc(studentDocRef, updateData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: studentDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        });
    };

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(student.email)}>
                Copy Email
              </DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              {student.deviceId && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground"
                       >
                        <SmartphoneNfc className="mr-2 h-4 w-4" />
                        Remove Device Registration
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the device registration for <span className="font-semibold">{student.firstName} {student.lastName}</span>. They will need to re-register a device to generate attendance QR codes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRemoveDevice}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          Confirm & Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    );
};

export const getColumns = (): ColumnDef<Student>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Student
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="pl-4 flex items-center gap-3">
        <Avatar>
            <AvatarImage src={row.original.avatarUrl} />
            <AvatarFallback>{row.original.firstName?.charAt(0)}{row.original.lastName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <div className="font-medium">{row.original.firstName} {row.original.lastName}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "studentNumber",
    header: "Student No.",
  },
  {
    accessorKey: "course",
    header: "Course",
  },
  {
    id: "actions",
    cell: ActionsCell,
  },
];
