import Link from "next/link";
import { AppWindow, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockStudents } from "@/lib/data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const student = mockStudents[0]; // Mocking the logged-in student

function StudentHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/student/dashboard" className="flex items-center space-x-2">
            <AppWindow className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold font-headline">AttendEase</span>
          </Link>
          <nav className="flex gap-6">
            <Link
              href="/student/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              My Subjects
            </Link>
            <Link
              href="/student/attendance"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              My Attendance
            </Link>
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={student.avatarUrl} alt={student.name} />
                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{student.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {student.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}


export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <StudentHeader />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  );
}
