
'use client';
import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { AppWindow, User, LogOut, BookUser, CheckSquare, QrCode, SmartphoneNfc } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import type { Student } from '@/lib/types';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog';

const DeregistrationDialog = ({ onConfirm }: { onConfirm: () => void }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <SmartphoneNfc className="mr-2 h-4 w-4" />
          <span>Request Deregistration</span>
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request Device Deregistration?</AlertDialogTitle>
          <AlertDialogDescription>
            This will generate a one-time code that you must provide to your teacher to complete the process. Your current device will remain registered until the request is approved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Generate Code
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


function StudentHeader() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const [deregCode, setDeregCode] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: student, isLoading: isStudentLoading } = useDoc<Student>(userDocRef);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleRequestDeregistration = async () => {
    if (!userDocRef) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const updateData = {
      deregistrationCode: code,
      deregistrationRequestedAt: serverTimestamp(),
    };

    try {
      await updateDoc(userDocRef, updateData);
      setDeregCode(code);
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: updateData,
      }));
    }
  };

  const isLoading = isUserLoading || isStudentLoading;

  return (
    <>
    <Dialog open={!!deregCode} onOpenChange={(open) => !open && setDeregCode(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Deregistration Code Generated</DialogTitle>
                <DialogDescription>
                    Please provide this code to your teacher to finalize your device deregistration request. This code is valid for a limited time.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p className="text-center text-5xl font-mono tracking-widest font-bold text-primary bg-primary/10 py-4 rounded-lg">
                    {deregCode}
                </p>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button>Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link
            href="/student/dashboard"
            className="mr-6 flex items-center space-x-2"
          >
            <div className="bg-primary rounded-md p-2">
              <AppWindow className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold font-headline text-lg">AttendEase</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button
              variant="ghost"
              asChild
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Link href="/student/dashboard">My Subjects</Link>
            </Button>
             <Button
              variant="ghost"
              asChild
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Link href="/student/enrollment">Enrollment</Link>
            </Button>
             <Button
              variant="ghost"
              asChild
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Link href="/student/profile">Profile</Link>
            </Button>
          </nav>
          {isLoading ? (
             <Skeleton className="h-10 w-10 rounded-full" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student?.avatarUrl} alt={student?.name} />
                    <AvatarFallback>{student?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {student?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {student?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/student/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                 {student?.deviceId && (
                  <DeregistrationDialog onConfirm={handleRequestDeregistration} />
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
    </>
  );
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);
  
  if (isUserLoading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <StudentHeader />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  );
}
