'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { LandingPage } from './landing-page';
import { Loader2 } from 'lucide-react';

export default function AppRoot() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

  const isLoading = isUserLoading || (user && isUserDocLoading);

  useEffect(() => {
    if (!isLoading && user && userData) {
      if (userData.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/student/dashboard');
      }
    }
  }, [isLoading, user, userData, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
                <p className="text-lg font-semibold">AttendEase</p>
                <p className="text-sm text-muted-foreground">Loading your experience...</p>
            </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // If not loading and no user, show the landing page
    return <LandingPage />;
  }

  // If user is present but userData is still loading or has an issue, show a loader.
  // This state is temporary before the useEffect redirects.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
                <p className="text-lg font-semibold">AttendEase</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            </div>
        </div>
      </div>
  );
}
