'use client';

import Link from 'next/link';
import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AppWindow, AlertTriangle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  
  // Student fields
  const [course, setCourse] = useState('');
  const [studentNumber, setStudentNumber] = useState('');

  // Admin (Faculty) field
  const [facultyId, setFacultyId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleRegister = async () => {
    setError(null);
    let missingFields = !firstName || !lastName || !email || !password;
    if (role === 'student' && (!course || !studentNumber)) {
        missingFields = true;
    }
    if (role === 'admin' && !facultyId) {
        missingFields = true;
    }

    if (missingFields) {
      setError('Please fill out all required fields.');
      // This will close the dialog, but the error will be visible on the form.
      // We return false to prevent the dialog from closing if we wanted it to stay open.
      return false; 
    }

    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userProfile: any = {
        id: user.uid,
        firstName,
        lastName,
        email: user.email,
        name: `${firstName} ${lastName}`,
        role,
      };

      if (role === 'student') {
        userProfile.course = course;
        userProfile.studentNumber = studentNumber;
      } else {
        userProfile.facultyId = facultyId;
      }
      
      const userDocRef = doc(firestore, 'users', user.uid);
      
      setDocumentNonBlocking(userDocRef, userProfile, { merge: false });

      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/student/dashboard');
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please use at least 6 characters.';
      }
      setError(errorMessage);
    } finally {
        setIsSubmitting(false);
    }
    return true;
  };
  
  const canTriggerDialog = () => {
    if (!firstName || !lastName || !email || !password) return false;
    if (role === 'student' && (!course || !studentNumber)) return false;
    if (role === 'admin' && !facultyId) return false;
    return true;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12">
      <Card className="w-full max-w-md mx-4">
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
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            Enter your details below to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label>I am a...</Label>
            <RadioGroup defaultValue="student" value={role} onValueChange={(value: 'student' | 'admin') => setRole(value)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="student" id="r-student" />
                <Label htmlFor="r-student">Student</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="r-admin" />
                <Label htmlFor="r-admin">Teacher (Admin)</Label>
              </div>
            </RadioGroup>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>
         
          {role === 'student' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="studentNumber">Student Number</Label>
                <Input
                  id="studentNumber"
                  placeholder="2024-00123"
                  required
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="course">Course</Label>
                <Select onValueChange={setCourse} value={course}>
                    <SelectTrigger id="course">
                        <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="BSIT">BSIT</SelectItem>
                        <SelectItem value="BMMA">BMMA</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </>
          )}

          {role === 'admin' && (
            <div className="grid gap-2">
                <Label htmlFor="facultyId">Faculty ID #</Label>
                <Input
                    id="facultyId"
                    placeholder="F-12345"
                    required
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                />
            </div>
          )}

        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={isSubmitting || !canTriggerDialog()}>
                    Create Account
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Privacy Statement & Terms of Service</AlertDialogTitle>
                <AlertDialogDescription className="max-h-60 overflow-y-auto pr-4">
                    Welcome to AttendEase! By creating an account, you agree to our terms and the collection and use of your information as described below.
                    <br /><br />
                    <strong>1. Information We Collect:</strong> We collect information you provide directly, such as your name, email, and role (student or teacher). We also collect device-specific information to securely link your account to your device for QR code generation.
                    <br /><br />
                    <strong>2. How We Use Your Information:</strong> Your data is used to provide, maintain, and improve our services, including managing attendance records, authenticating users, and ensuring the security of your account.
                    <br /><br />
                    <strong>3. Data Security:</strong> We implement security measures to protect your information from unauthorized access. Your QR codes are generated with a unique secret tied to the attendance session, ensuring that only valid scans are recorded.
                    <br /><br />
                    By clicking "Agree & Continue," you acknowledge that you have read, understood, and agree to be bound by these terms.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegister} disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Agree & Continue'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline hover:text-primary">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
