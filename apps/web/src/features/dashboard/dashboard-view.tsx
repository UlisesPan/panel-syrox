"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowRightIcon,
  DollarSignIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";
import type { DashboardSummary } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/crud/page-header";
import { SaleStatusBadge } from "@/components/status-badge";
import { apiFetch, getErrorMessage } from "@/lib/api-client";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber, formatRelative } from "@/lib/format";

const chartConfig = {
  revenue: { label: "Ingresos", color: "var(--brand)" },
} satisfies ChartConfig;

export function DashboardView() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardSummary>("/dashboard/summary"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inicio"
        description="Resumen de la actividad de tu tienda."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/productos/nuevo">
                <PlusIcon /> Nuevo producto
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ventas/nueva">
                <ShoppingCartIcon /> Generar venta
              </Link>
            </Button>
          </>
        }
      />

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{getErrorMessage(error)}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ingresos"
              icon={DollarSignIcon}
              value={data && formatCurrency(data.sales.revenue)}
              hint={
                data &&
                (data.pending.count > 0
                  ? `${formatCurrency(data.pending.amount)} por cobrar (${data.pending.count} ${data.pending.count === 1 ? "venta" : "ventas"})`
                  : "Todo cobrado")
              }
            />
            <StatCard
              title="Ventas cobradas"
              icon={ReceiptIcon}
              value={data && formatNumber(data.sales.count)}
              hint={data && `Ticket promedio ${formatCurrency(data.sales.averageTicket)}`}
            />
            <StatCard
              title="Productos"
              icon={PackageIcon}
              value={data && formatNumber(data.products.total)}
              hint={data && `${data.products.active} activos`}
            />
            <StatCard
              title="Catálogo"
              icon={TrophyIcon}
              value={data && `${data.categories} categorías`}
              hint={data && `${data.brands} marcas`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <RevenueChart data={data} isPending={isPending} />
            <TopProducts data={data} isPending={isPending} />
          </div>

          <RecentSales data={data} isPending={isPending} />
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value?: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <Icon className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {value ? (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        ) : (
          <Skeleton className="h-8 w-28" />
        )}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : <Skeleton className="h-3 w-20" />}
      </CardContent>
    </Card>
  );
}

function RevenueChart({ data, isPending }: { data?: DashboardSummary; isPending: boolean }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Ingresos de los últimos 30 días</CardTitle>
        <CardDescription>Solo ventas cobradas</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={data.revenueByDay} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(value: string) => formatDate(`${value}T12:00:00`).replace(/ de \d{4}|,? \d{4}/, "")}
              />
              <YAxis
                width={64}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatCompactCurrency(value)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(`${value}T12:00:00`)}
                    formatter={(value) => (
                      <span className="font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                    )}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill="url(#fillRevenue)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopProducts({ data, isPending }: { data?: DashboardSummary; isPending: boolean }) {
  const max = Math.max(1, ...(data?.topProducts.map((p) => p.quantity) ?? []));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos más vendidos</CardTitle>
        <CardDescription>Por unidades vendidas</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending &&
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        {data?.topProducts.length === 0 && (
          <Empty className="border-0 p-4">
            <EmptyHeader>
              <EmptyTitle>Sin ventas todavía</EmptyTitle>
              <EmptyDescription>No hay productos top para mostrar.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {data?.topProducts.map((product, index) => (
          <div key={product.productId ?? product.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">
                <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                {product.name}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{product.quantity} uds.</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${(product.quantity / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentSales({ data, isPending }: { data?: DashboardSummary; isPending: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas recientes</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ventas">
              Ver todas <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {data?.recentSales.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Todavía no se registraron ventas.</p>
        )}
        <ul className="divide-y">
          {data?.recentSales.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/ventas?sale=${sale.id}`}
                className="-mx-2 flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{sale.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Venta #{sale.number} · {sale.itemsCount} {sale.itemsCount === 1 ? "ítem" : "ítems"} ·{" "}
                    {formatRelative(sale.createdAt)}
                  </p>
                </div>
                <SaleStatusBadge status={sale.status} />
                <span className="w-28 text-right font-semibold tabular-nums">{formatCurrency(sale.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
