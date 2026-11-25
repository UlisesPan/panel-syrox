"use client";

import { useState } from "react";
import Link from "next/link";
import { FilterXIcon, PackageSearchIcon, PlusIcon } from "lucide-react";
import { PRODUCT_STATUSES, type Product } from "@panel/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { PageHeader } from "@/components/crud/page-header";
import { RowActions } from "@/components/crud/row-actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { SearchInput } from "@/components/data-table/search-input";
import { ProductThumb } from "@/components/product-thumb";
import { ProductStatusBadge } from "@/components/status-badge";
import { useListParams } from "@/hooks/use-list-params";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { formatCurrency } from "@/lib/format";
import { productStatusMeta } from "@/lib/labels";
import { useBrandOptions } from "@/features/brands/brands.resource";
import { useCategoryOptions } from "@/features/categories/categories.resource";
import { productsResource } from "./products.resource";

const ALL = "all";
const FILTER_KEYS = ["status", "categoryId", "brandId"] as const;

const columns: DataTableColumn<Product>[] = [
  {
    id: "name",
    header: "Producto",
    sortKey: "name",
    cell: (p) => (
      <div className="flex min-w-60 items-center gap-3">
        <ProductThumb src={p.images[0]} alt={p.name} />
        <div className="min-w-0">
          <Link href={`/productos/${p.id}/editar`} className="block truncate font-medium hover:underline">
            {p.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{p.sku ?? p.description ?? "—"}</p>
        </div>
      </div>
    ),
  },
  {
    id: "category",
    header: "Categoría",
    sortKey: "category",
    cell: (p) => p.category?.name ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: "brand",
    header: "Marca",
    sortKey: "brand",
    cell: (p) => p.brand.name,
  },
  {
    id: "price",
    header: "Precio",
    sortKey: "price",
    cell: (p) => <span className="tabular-nums">{formatCurrency(p.price)}</span>,
  },
  {
    id: "variants",
    header: "Variantes",
    cell: (p) =>
      p.variantsCount > 0 ? (
        <Badge variant="outline">{p.variantsCount} variantes</Badge>
      ) : (
        <span className="text-muted-foreground">SKU único</span>
      ),
  },
  { id: "status", header: "Estado", sortKey: "status", cell: (p) => <ProductStatusBadge status={p.status} /> },
];

export function ProductsView() {
  const { state, queryParams, setParams, toggleSort, resetFilters } = useListParams({ filterKeys: FILTER_KEYS });
  const list = useResourceList(productsResource, queryParams);
  const { remove } = useResourceMutations(productsResource);
  const { data: categories = [] } = useCategoryOptions();
  const { data: brands = [] } = useBrandOptions();
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const hasFilters = Boolean(state.search || Object.keys(state.filters).length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description="Catálogo de productos, con sus opciones y variantes."
        actions={
          <Button asChild>
            <Link href="/productos/nuevo">
              <PlusIcon /> Nuevo producto
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row">
            <SearchInput
              value={state.search}
              onChange={(search) => setParams({ search })}
              placeholder="Buscar por nombre o SKU…"
              className="lg:max-w-sm"
            />
            <div className="grid gap-2 sm:grid-cols-3 lg:flex">
              <FilterSelect
                label="Estado"
                allLabel="Todos los estados"
                value={state.filters.status}
                options={PRODUCT_STATUSES.map((s) => ({ value: s, label: productStatusMeta[s].label }))}
                onChange={(status) => setParams({ status })}
              />
              <FilterSelect
                label="Categoría"
                allLabel="Todas las categorías"
                value={state.filters.categoryId}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(categoryId) => setParams({ categoryId })}
              />
              <FilterSelect
                label="Marca"
                allLabel="Todas las marcas"
                value={state.filters.brandId}
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
                onChange={(brandId) => setParams({ brandId })}
              />
              {hasFilters && (
                <Button variant="ghost" onClick={resetFilters}>
                  <FilterXIcon /> Limpiar
                </Button>
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={list.data?.data}
            meta={list.data?.meta}
            getRowId={(p) => p.id}
            isLoading={list.isPending}
            isFetching={list.isFetching}
            sort={state}
            onSortChange={toggleSort}
            onPageChange={(page) => setParams({ page })}
            onPageSizeChange={(pageSize) => setParams({ pageSize })}
            rowActions={(p) => (
              <RowActions label={p.name} editHref={`/productos/${p.id}/editar`} onDelete={() => setToDelete(p)} />
            )}
            emptyState={
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PackageSearchIcon />
                  </EmptyMedia>
                  <EmptyTitle>{hasFilters ? "Sin resultados" : "Todavía no hay productos"}</EmptyTitle>
                  <EmptyDescription>
                    {hasFilters ? "Probá con otros filtros." : "Cargá el primer producto del catálogo."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {hasFilters ? (
                    <Button size="sm" variant="outline" onClick={resetFilters}>
                      Limpiar filtros
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <Link href="/productos/nuevo">Nuevo producto</Link>
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            }
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`¿Eliminar “${toDelete?.name ?? ""}”?`}
        description="Las ventas existentes conservan el nombre y precio del producto. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        isPending={remove.isPending}
        onConfirm={() => toDelete && remove.mutateAsync(toDelete.id)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger className="w-full lg:w-44" aria-label={`Filtrar por ${label.toLowerCase()}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
