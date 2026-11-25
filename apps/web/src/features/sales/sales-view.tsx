"use client";

import Link from "next/link";
import { PlusIcon, ReceiptIcon } from "lucide-react";
import { SALE_STATUSES, type Sale } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/crud/page-header";
import { RowActions } from "@/components/crud/row-actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { SearchInput } from "@/components/data-table/search-input";
import { PaymentStatusBadge, SaleStatusBadge } from "@/components/status-badge";
import { useListParams } from "@/hooks/use-list-params";
import { useResourceList } from "@/hooks/use-resource";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabels, saleStatusMeta } from "@/lib/labels";
import { salesResource } from "./sales.resource";
import { SaleDetailDialog } from "./sale-detail-dialog";

const ALL = "all";

const columns: DataTableColumn<Sale>[] = [
  {
    id: "number",
    header: "N°",
    sortKey: "number",
    cell: (s) => <span className="font-mono text-muted-foreground">#{s.number}</span>,
    className: "w-20",
  },
  {
    id: "customer",
    header: "Cliente",
    sortKey: "customerName",
    cell: (s) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{s.customerName}</p>
        {s.customerEmail && <p className="truncate text-xs text-muted-foreground">{s.customerEmail}</p>}
      </div>
    ),
  },
  {
    id: "items",
    header: "Ítems",
    cell: (s) => <span className="tabular-nums">{s.itemsCount}</span>,
    className: "w-16",
  },
  {
    id: "payment",
    header: "Pago",
    sortKey: "paymentStatus",
    cell: (s) => (
      <div className="flex flex-col items-start gap-1">
        <PaymentStatusBadge status={s.paymentStatus} />
        <span className="text-xs text-muted-foreground">{paymentMethodLabels[s.paymentMethod]}</span>
      </div>
    ),
  },
  { id: "status", header: "Estado", sortKey: "status", cell: (s) => <SaleStatusBadge status={s.status} /> },
  {
    id: "createdAt",
    header: "Fecha",
    sortKey: "createdAt",
    cell: (s) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(s.createdAt)}</span>,
  },
  {
    id: "total",
    header: "Total",
    sortKey: "total",
    cell: (s) => <span className="font-semibold tabular-nums">{formatCurrency(s.total)}</span>,
    className: "text-right",
    headerClassName: "text-right",
  },
];

export function SalesView() {
  const { state, queryParams, setParams, toggleSort } = useListParams({
    filterKeys: ["status", "sale"] as const,
  });
  // `sale` es estado de UI (detalle abierto), no un filtro de la API.
  const { sale: openSaleId, ...apiParams } = queryParams as typeof queryParams & { sale?: string };
  const list = useResourceList(salesResource, apiParams);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Registro de todas las ventas de la tienda."
        actions={
          <Button asChild>
            <Link href="/ventas/nueva">
              <PlusIcon /> Generar venta
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={state.search}
              onChange={(search) => setParams({ search })}
              placeholder="Buscar por cliente, email o N° de venta…"
              className="sm:max-w-sm"
            />
            <Select
              value={state.filters.status ?? ALL}
              onValueChange={(status) => setParams({ status: status === ALL ? null : status })}
            >
              <SelectTrigger className="sm:w-48" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {SALE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {saleStatusMeta[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={list.data?.data}
            meta={list.data?.meta}
            getRowId={(s) => s.id}
            isLoading={list.isPending}
            isFetching={list.isFetching}
            sort={state}
            onSortChange={toggleSort}
            onPageChange={(page) => setParams({ page, sale: openSaleId })}
            onPageSizeChange={(pageSize) => setParams({ pageSize })}
            onRowClick={(s) => setParams({ sale: s.id, page: state.page })}
            rowActions={(s) => (
              <RowActions label={`venta #${s.number}`} onView={() => setParams({ sale: s.id, page: state.page })} />
            )}
            emptyState={
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptIcon />
                  </EmptyMedia>
                  <EmptyTitle>No hay ventas</EmptyTitle>
                  <EmptyDescription>
                    {state.search || state.filters.status
                      ? "Ninguna venta coincide con los filtros."
                      : "Registrá la primera venta para verla acá."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild size="sm">
                    <Link href="/ventas/nueva">Generar venta</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            }
          />
        </CardContent>
      </Card>

      <SaleDetailDialog saleId={openSaleId ?? null} onClose={() => setParams({ sale: null, page: state.page })} />
    </div>
  );
}
