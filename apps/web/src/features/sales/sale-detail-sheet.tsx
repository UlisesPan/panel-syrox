"use client";

import { SALE_STATUSES, type SaleStatus } from "@panel/shared";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SaleStatusBadge } from "@/components/status-badge";
import { useResourceDetail } from "@/hooks/use-resource";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabels, saleStatusMeta } from "@/lib/labels";
import { salesResource, useUpdateSaleStatus } from "./sales.resource";

const FINAL: SaleStatus[] = ["DELIVERED", "CANCELLED"];

export function SaleDetailSheet({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { data: sale, isPending } = useResourceDetail(salesResource, saleId);
  const updateStatus = useUpdateSaleStatus();
  const isFinal = sale ? FINAL.includes(sale.status) : true;

  return (
    <Sheet open={Boolean(saleId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{sale ? `Venta #${sale.number}` : "Detalle de venta"}</SheetTitle>
          <SheetDescription>{sale ? formatDateTime(sale.createdAt) : "Cargando…"}</SheetDescription>
        </SheetHeader>

        {isPending || !sale ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-4">
            <section className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Cliente" value={sale.customerName} />
              <Detail label="Email" value={sale.customerEmail ?? "—"} />
              <Detail label="Medio de pago" value={paymentMethodLabels[sale.paymentMethod]} />
              <Detail label="Registrada por" value={sale.createdBy?.name ?? "—"} />
              {sale.notes && <Detail label="Notas" value={sale.notes} className="col-span-2" />}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Estado</h3>
              <div className="flex items-center gap-3">
                <SaleStatusBadge status={sale.status} />
                <Select
                  value={sale.status}
                  disabled={isFinal || updateStatus.isPending}
                  onValueChange={(status) => updateStatus.mutate({ id: sale.id, status: status as SaleStatus })}
                >
                  <SelectTrigger size="sm" className="w-48" aria-label="Cambiar estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {saleStatusMeta[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isFinal && (
                <p className="text-xs text-muted-foreground">Las ventas entregadas o canceladas no cambian de estado.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium">Productos</h3>
              <ul className="divide-y rounded-lg border">
                {sale.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantLabel && <>{item.variantLabel} · </>}
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                        {!item.productId && " · producto eliminado"}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(sale.total)}</span>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}
