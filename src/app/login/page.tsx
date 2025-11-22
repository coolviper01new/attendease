'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppWindow } from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);


  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter both email and password.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged + useEffect below will handle the redirect
    } catch (error: any) {
      console.error(error);
       toast({
        variant: "destructive",
        title: "Sign in failed",
        description: "Invalid email or password. Please try again.",
      });
       setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const isLoading = isUserLoading || isUserDocLoading;
    if (!isLoading && user && userData) {
      if (userData.role === 'admin') {
          router.push('/admin/dashboard');
      } else {
          router.push('/student/dashboard');
      }
    }
  }, [user, userData, isUserLoading, isUserDocLoading, router]);

  // If user is already logged in and we know their role, redirect them.
  if (!isUserLoading && !isUserDocLoading && user && userData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>You are already logged in. Redirecting...</p>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold font-headline"
            >
              <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                <AppWindow className="w-8 h-8" />
              </div>
            </Link>
          </div>
          <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isUserLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isUserLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleSignIn} disabled={isSubmitting || isUserLoading || isUserDocLoading}>
            {isSubmitting || isUserLoading || isUserDocLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline hover:text-primary">
              Register
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
