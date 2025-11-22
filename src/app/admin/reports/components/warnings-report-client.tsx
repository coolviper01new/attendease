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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type FormattedWarning = {
    id: string;
    studentId: string;
    subjectId: string;
    date: string;
    reason: string;
    absenceDates: string[];
    studentName: string;
    subjectName: string;
};

const columns: ColumnDef<FormattedWarning>[] = [
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
            Date Issued
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({row}) => <div className="pl-4">{new Date(row.original.date).toLocaleDateString()}</div>
    },
    {
        accessorKey: "reason",
        header: "Reason",
        cell: ({row}) => (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="link" className="p-0 h-auto">View Reason</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">AI Reasoning</h4>
                            <p className="text-sm text-muted-foreground">{row.original.reason}</p>
                        </div>
                         <div className="space-y-2">
                            <h4 className="font-medium leading-none">Consecutive Absences</h4>
                            <p className="text-sm text-muted-foreground">{row.original.absenceDates.join(', ')}</p>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        )
    }
]

interface WarningsReportClientProps {
  data: FormattedWarning[];
}

export function WarningsReportClient({ data }: WarningsReportClientProps) {
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
    <div>
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
            {table.getRowModel().rows?.length ? (
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
                  No warnings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
