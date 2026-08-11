"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/states/empty-error";
import { cn } from "@/lib/utils";

export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
    ),
    enableSorting: false,
    size: 32,
  };
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = "Search…",
  getSearchText,
  onExportCsv,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your filters or search.",
  onRowClick,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  onExportCsv?: (rows: T[]) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search || !getSearchText) return data;
    const q = search.toLowerCase();
    return data.filter((row) => getSearchText(row).toLowerCase().includes(q));
  }, [data, search, getSearchText]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {getSearchText && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-56 pl-8"
            />
          </div>
        )}
        {selectedCount > 0 && (
          <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-3.5 w-3.5" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.id !== "select")
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onExportCsv(
                  selectedCount > 0
                    ? table.getSelectedRowModel().rows.map((r) => r.original)
                    : filtered
                )
              }
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="scroll-thin overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border">
                  {hg.headers.map((header) => {
                    const sortable = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground",
                          sortable && "cursor-pointer select-none hover:text-foreground"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortable &&
                            (sorted === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            ))}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-surface-muted/60",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {table.getPageCount() > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{" "}
            {filtered.length} rows
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function rowsToCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = row[h];
          const s = v === null || v === undefined ? "" : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
