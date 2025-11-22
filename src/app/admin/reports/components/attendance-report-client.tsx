
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttendanceStatus, User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type FormattedAttendance = {
    id: string;
    studentId: string;
    subjectId: string;
    date: string;
    status: AttendanceStatus;
    recordedBy: string;
    studentName: string;
    subjectName: string;
};

const columns: ColumnDef<FormattedAttendance>[] = [
    {
        accessorKey: "studentName",
        header: "Student",
    },
    {
        accessorKey: "subjectName",
        header: "Subject",
    },
    {
        accessorKey: "date",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({row}) => <div className="pl-4">{new Date(row.original.date).toLocaleDateString()}</div>
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({row}) => {
            const status = row.original.status;
            return (
              <Badge 
                variant={status === 'present' ? 'default' : status === 'absent' ? 'destructive' : 'secondary'} 
                className={cn(
                  'capitalize',
                  status === 'present' && 'bg-green-600/10 text-green-700 border-green-600/20 hover:bg-green-600/20',
                  status === 'absent' && 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
                  status === 'late' && 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20'
                )}
              >
                {status}
              </Badge>
            )
        }
    }
]

interface AttendanceReportClientProps {
  data: FormattedAttendance[];
  isLoading: boolean;
}

export function AttendanceReportClient({ data, isLoading }: AttendanceReportClientProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="mt-4">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by student name..."
          value={(table.getColumn("studentName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("studentName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                            <p>Loading attendance records...</p>
                        </div>
                    </TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    