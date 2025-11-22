import { Header } from "@/components/header";
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { AdminSidebarNav } from "./components/admin-sidebar-nav";
import Link from "next/link";
import { AppWindow } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="container flex items-center justify-between p-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold">
            <AppWindow className="h-6 w-6 text-primary" />
            <span>Crema</span>
        </Link>
        <SidebarTrigger />
      </div>
      <div className="flex">
        <Sidebar collapsible="icon" className="hidden md:flex w-64 flex-col">
            <SidebarHeader className="p-4">
                 <Link href="/" className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
                    <AppWindow className="h-8 w-8 text-primary" />
                    <span className="group-data-[collapsible=icon]:hidden">CREMA</span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <AdminSidebarNav />
            </SidebarContent>
        </Sidebar>
        <div className="flex-1">
            <Header />
            <main className="p-6">
                {children}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
