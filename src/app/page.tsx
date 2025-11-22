import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppWindow } from "lucide-react";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                    <AppWindow className="w-8 h-8" />
                </div>
            </div>
          <CardTitle className="text-2xl font-headline">Welcome to Crema</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            <Link href="/admin/dashboard">Sign in</Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Don't have an account? No problem! <br /> 
            You can access the <Link href="/student/dashboard" className="underline font-medium">Student Portal</Link> directly.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
