import Link from "next/link";
import { AppWindow, User, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
            <Link href="/student/dashboard" className="mr-6 flex items-center space-x-2">
                <div className="bg-primary rounded-md p-2">
                    <AppWindow className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-bold font-headline text-lg">AttendEase</span>
            </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1">
                <Button variant="ghost" asChild className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                    <Link href="/student/dashboard">My Subjects</Link>
                </Button>
                <Button variant="ghost" asChild className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                    <Link href="/student/attendance">My Attendance</Link>
                </Button>
            </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
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
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                </Link>
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
    <div className="relative flex min-h-screen flex-col bg-background">
      <StudentHeader />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  );
}
