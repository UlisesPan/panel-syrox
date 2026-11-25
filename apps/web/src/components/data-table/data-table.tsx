"use client";

import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Si está definido, la columna es ordenable y este valor se manda como `sortBy` a la API. */
  sortKey?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  /** Mientras se cambia de página/filtro se muestran los datos anteriores atenuados. */
  isFetching?: boolean;
  meta?: PaginationMeta;
  sort?: { sortBy?: string; sortOrder: "asc" | "desc" };
  onSortChange?: (sortKey: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  emptyState?: ReactNode;
}

/**
 * Tabla genérica para cualquier recurso. La paginación, el orden y la búsqueda
 * se resuelven en el servidor, así funciona igual con 10 o con 100.000 registros.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  isFetching,
  meta,
  sort,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  rowActions,
  emptyState,
}: DataTableProps<T>) {
  const totalColumns = columns.length + (rowActions ? 1 : 0);
  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border">
        <Table aria-busy={isLoading || isFetching}>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.sortKey && onSortChange ? (
                    <SortableHeader
                      label={column.header}
                      direction={sort?.sortBy === column.sortKey ? sort.sortOrder : undefined}
                      onClick={() => onSortChange(column.sortKey!)}
                    />
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-px text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
            {isLoading &&
              Array.from({ length: meta?.pageSize ?? 8 }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: totalColumns }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={totalColumns} className="h-48 text-center">
                  {emptyState ?? <span className="text-muted-foreground">No hay resultados.</span>}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              rows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {meta && onPageChange && (
        <DataTablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction?: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = direction === "asc" ? ArrowUpIcon : direction === "desc" ? ArrowDownIcon : ArrowUpDownIcon;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="-ml-2 h-7 font-medium"
      aria-label={`Ordenar por ${label}`}
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}
    >
      {label}
      <Icon className={cn("size-3.5", !direction && "text-muted-foreground/60")} />
    </Button>
  );
}
