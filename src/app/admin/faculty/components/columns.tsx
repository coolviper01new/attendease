
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Admin } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { placeholderImages } from "@/lib/placeholder-images";

const ActionsCell = ({ row }: { row: any }) => {
    const faculty = row.original as Admin;

    return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(faculty.email)}>
                Copy Email
              </DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    );
};

export const getColumns = (): ColumnDef<Admin>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Faculty
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const faculty = row.original;
      const avatar = placeholderImages.find(p => p.id === 'admin-avatar') || placeholderImages[0];

      return (
        <div className="pl-4 flex items-center gap-3">
          <Avatar>
              <AvatarImage src={faculty.avatarUrl || avatar.url} data-ai-hint={avatar.hint} />
              <AvatarFallback>{faculty.firstName?.charAt(0)}{faculty.lastName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
              <div className="font-medium">{faculty.firstName} {faculty.lastName}</div>
              <div className="text-xs text-muted-foreground">{faculty.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "facultyId",
    header: "Faculty ID",
  },
  {
    id: "actions",
    cell: ActionsCell,
  },
];
