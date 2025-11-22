"use client";
import { usePathname } from "next/navigation";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel
} from "@/components/ui/sidebar";
import { LayoutDashboard, Book, BarChart3, Users, Building, Calendar, GraduationCap } from "lucide-react";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/subjects", label: "Subjects", icon: Book },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/blocks", label: "Blocks", icon: Building },
  { href: "/admin/semesters", label: "Semesters", icon: Calendar },
  { href: "/admin/years", label: "School Years", icon: GraduationCap },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
      <SidebarGroup>
        <SidebarGroupLabel className="!text-xs !font-semibold">APPLICATION</SidebarGroupLabel>
        <SidebarMenu>
            {links.map((link) => (
            <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(link.href)}
                tooltip={link.label}
                className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                >
                <a href={link.href}>
                    <link.icon />
                    <span>{link.label}</span>
                </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarGroup>
  );
}
