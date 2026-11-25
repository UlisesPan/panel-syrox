"use client";

import { useRouter } from "next/navigation";
import { UsersIcon } from "lucide-react";
import type { Customer } from "@panel/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/crud/page-header";
import { RowActions } from "@/components/crud/row-actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { SearchInput } from "@/components/data-table/search-input";
import { useListParams } from "@/hooks/use-list-params";
import { useResourceList } from "@/hooks/use-resource";
import { defineResource } from "@/lib/resource";
import { formatCurrency, formatDate, formatRelative, initials } from "@/lib/format";

const customersResource = defineResource<Customer, never>({
  key: "customers",
  endpoint: "/customers",
  labels: { singular: "Cliente", plural: "Clientes", gender: "m" },
});

const salesHref = (c: Customer) => `/ventas?search=${encodeURIComponent(c.email ?? c.name)}`;

const columns: DataTableColumn<Customer>[] = [
  {
    id: "name",
    header: "Cliente",
    sortKey: "name",
    cell: (c) => (
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
        >
          {initials(c.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{c.name}</p>
          <p className="truncate text-xs text-muted-foreground">{c.email ?? "Sin email"}</p>
        </div>
      </div>
    ),
  },
  {
    id: "phone",
    header: "Teléfono",
    cell: (c) => <span className="text-muted-foreground tabular-nums">{c.phone ?? "—"}</span>,
  },
  {
    id: "orders",
    header: "Pedidos",
    sortKey: "ordersCount",
    cell: (c) => <span className="tabular-nums">{c.ordersCount}</span>,
  },
  {
    id: "lastOrder",
    header: "Última compra",
    sortKey: "lastOrderAt",
    cell: (c) => (
      <div>
        <p className="whitespace-nowrap">{formatDate(c.lastOrderAt)}</p>
        <p className="text-xs text-muted-foreground">{formatRelative(c.lastOrderAt)}</p>
      </div>
    ),
  },
  {
    id: "total",
    header: "Total gastado",
    sortKey: "totalSpent",
    cell: (c) => <span className="font-semibold tabular-nums">{formatCurrency(c.totalSpent)}</span>,
    className: "text-right",
    headerClassName: "text-right",
  },
];

export function CustomersView() {
  const router = useRouter();
  const { state, queryParams, setParams, toggleSort } = useListParams({ sortBy: "lastOrderAt", sortOrder: "desc" });
  const list = useResourceList(customersResource, queryParams);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Se generan automáticamente a partir de las ventas registradas. El total excluye ventas canceladas."
      />
      <Card>
        <CardContent className="flex flex-col gap-4">
          <SearchInput
            value={state.search}
            onChange={(search) => setParams({ search })}
            placeholder="Buscar por nombre o email…"
            className="sm:max-w-sm"
          />
          <DataTable
            columns={columns}
            data={list.data?.data}
            meta={list.data?.meta}
            getRowId={(c) => c.key}
            isLoading={list.isPending}
            isFetching={list.isFetching}
            sort={state}
            onSortChange={toggleSort}
            onPageChange={(page) => setParams({ page })}
            onPageSizeChange={(pageSize) => setParams({ pageSize })}
            onRowClick={(c) => router.push(salesHref(c))}
            rowActions={(c) => <RowActions label={c.name} viewHref={salesHref(c)} viewTooltip="Ver sus ventas" />}
            emptyState={
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>{state.search ? "Sin resultados" : "Todavía no hay clientes"}</EmptyTitle>
                  <EmptyDescription>
                    {state.search
                      ? `No encontramos clientes para “${state.search}”.`
                      : "Aparecerán acá a medida que registres ventas."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
