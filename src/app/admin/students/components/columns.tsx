
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const DeregistrationApprovalDialog = ({ student }: { student: Student }) => {
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleApproval = async () => {
        setError(null);
        if (!code) {
            setError("Please enter the code provided by the student.");
            return;
        }
        if (code !== student.deregistrationCode) {
            setError("The code does not match. Please try again.");
            return;
        }

        setIsSubmitting(true);
        const studentDocRef = doc(firestore, 'users', student.id);
        const updateData = { 
            deviceId: null,
            deregistrationCode: null,
            deregistrationRequestedAt: null,
        };

        try {
            await updateDoc(studentDocRef, updateData);
            // The dialog will close automatically on success if wrapped in a way that state changes trigger closure.
            // Or manually close if needed. For now, we rely on parent state re-render.
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: studentDocRef.path,
                operation: 'update',
                requestResourceData: updateData,
            }));
            setError("An error occurred. You may not have permission to perform this action.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog onOpenChange={() => { setCode(''); setError(null); }}>
            <DialogTrigger asChild>
                <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-yellow-500 outline-none transition-colors focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                    <SmartphoneNfc className="mr-2 h-4 w-4" />
                    <span>Approve Deregistration</span>
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve Device Deregistration</DialogTitle>
                    <DialogDescription>
                        To complete the deregistration for {student.firstName} {student.lastName}, please enter the 6-digit code they provide.
                    </DialogDescription>
                </DialogHeader>
                {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dereg-code" className="text-right">
                            Code
                        </Label>
                        <Input
                            id="dereg-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="col-span-3"
                            maxLength={6}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleApproval} disabled={isSubmitting}>
                        {isSubmitting ? 'Approving...' : 'Approve & Remove'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


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
                  {student.deregistrationCode ? (
                    <DeregistrationApprovalDialog student={student} />
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground"
                         >
                          <SmartphoneNfc className="mr-2 h-4 w-4" />
                          Remove Device (Manual)
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
                  )}
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
    accessorKey: "deregistrationCode",
    header: "Dereg. Request",
    cell: ({ row }) => {
      return row.original.deregistrationCode ? (
        <div className="text-center text-yellow-500 font-mono text-sm">{row.original.deregistrationCode}</div>
      ) : null;
    }
  },
  {
    id: "actions",
    cell: ActionsCell,
  },
];

    