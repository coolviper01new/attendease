import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppWindow } from "lucide-react";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <AppWindow className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome to AttendEase</CardTitle>
          <p className="text-muted-foreground">Your Class and Attendance Management System</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <p className="text-center text-muted-foreground">
              Choose your portal to get started.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button asChild size="lg">
                    <Link href="/admin/dashboard">Admin Portal</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                    <Link href="/student/dashboard">Student Portal</Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
