"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import type { PaginationMeta } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";

const PAGE_SIZES = [10, 20, 50];

interface DataTablePaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTablePagination({ meta, onPageChange, onPageSizeChange }: DataTablePaginationProps) {
  const { page, pageSize, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 text-sm sm:flex-row">
      <p className="text-muted-foreground">
        Mostrando {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden text-muted-foreground sm:inline">Filas</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-18" aria-label="Filas por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="text-muted-foreground tabular-nums">
          Página {page} de {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="Primera página"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Página siguiente"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Última página"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
