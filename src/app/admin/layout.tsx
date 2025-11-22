import { Header } from "@/components/header";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebarNav } from "./components/admin-sidebar-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
        <Header />
        <div className="container flex">
            <Sidebar collapsible="icon" className="w-64">
                <AdminSidebarNav />
            </Sidebar>
            <SidebarInset className="flex-1 p-6">
                {children}
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
