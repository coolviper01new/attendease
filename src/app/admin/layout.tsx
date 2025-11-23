
'use client';
import { Header } from "@/components/header";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { AdminSidebarNav } from "./components/admin-sidebar-nav";
import Link from "next/link";
import { AppWindow, Settings, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex items-center justify-between p-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold font-headline">
            <AppWindow className="h-6 w-6 text-primary" />
            <span>AttendEase</span>
        </Link>
        <SidebarTrigger />
      </div>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="hidden md:flex w-64 flex-col">
            <SidebarHeader className="p-4">
                 <Link href="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-foreground font-headline">
                    <div className="bg-primary rounded-md p-2">
                      <AppWindow className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <span className="group-data-[collapsible=icon]:hidden">AttendEase</span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <AdminSidebarNav />
            </SidebarContent>
            <SidebarFooter className="p-4 flex flex-col gap-2 border-t border-sidebar-border">
                <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                    <Settings />
                    <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                    <LifeBuoy />
                    <span className="group-data-[collapsible=icon]:hidden">Help</span>
                </Button>
            </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col bg-background">
            <Header />
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
