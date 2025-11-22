
'use client';
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "./ui/input";
import { useAuth, useDoc, useFirebase, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Admin } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: admin, isLoading: isAdminLoading } = useDoc<Admin>(userDocRef);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  const isLoading = isUserLoading || isAdminLoading;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
            <SidebarTrigger />
        </div>
        <div className="relative mr-4 hidden md:flex flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]" />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {isLoading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : admin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={admin.avatarUrl} alt={admin.name} />
                      <AvatarFallback>{admin.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{admin.firstName} {admin.lastName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {admin.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}

    