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
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
      // onAuthStateChanged will handle the redirect
    } catch (error: any) {
      console.error(error);
       toast({
        variant: "destructive",
        title: "Sign in failed",
        description: "Invalid email or password. Please try again.",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if(docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.role === 'admin') {
                router.push('/admin/dashboard');
            } else {
                router.push('/student/dashboard');
            }
        } else {
            // This case might happen if the user doc creation failed after auth creation
            // Or if user is not in 'users' collection for some reason.
            console.error("User document not found in Firestore.");
             toast({
                variant: "destructive",
                title: "Login Error",
                description: "Could not find user profile. Please contact support.",
            });
            auth.signOut(); // Sign out the user
        }
      });
    }
  }, [user, isUserLoading, router, firestore, auth, toast]);

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
          <Button className="w-full" onClick={handleSignIn} disabled={isSubmitting || isUserLoading}>
            {isSubmitting || isUserLoading ? 'Signing in...' : 'Sign In'}
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
