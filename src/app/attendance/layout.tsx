
'use client';
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Only perform the redirect check after the initial loading is complete.
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // While the user's auth state is loading, show a loading indicator.
  // This prevents the page from rendering before the auth check is complete.
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
          <p>Loading...</p>
      </div>
    );
  }

  // If loading is finished and we have a user, render the page content.
  if (user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
          {children}
      </div>
    );
  }

  // If loading is finished and there's no user, this will be null while the redirect happens.
  return null;
}
