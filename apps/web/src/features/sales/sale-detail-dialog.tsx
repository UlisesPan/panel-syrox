"use client";

import { useState, type ReactNode } from "react";
import {
  BanIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  RotateCcwIcon,
  CreditCardIcon,
  HistoryIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  ReceiptTextIcon,
  TruckIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { canTransitionSale, type SaleDetail, type SaleStatus } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { PaymentStatusBadge, SaleStatusBadge } from "@/components/status-badge";
import { useResourceDetail } from "@/hooks/use-resource";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabels, saleStatusMeta } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { salesResource, useUpdatePaymentStatus, useUpdateSaleStatus } from "./sales.resource";

const FLOW: SaleStatus[] = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED"];

const NEXT_STEP: Partial<Record<SaleStatus, { status: SaleStatus; label: string; icon: LucideIcon }>> = {
  PENDING: { status: "PAID", label: "Marcar como pagada", icon: CreditCardIcon },
  PAID: { status: "PREPARING", label: "Empezar preparación", icon: PackageIcon },
  PREPARING: { status: "SHIPPED", label: "Marcar como enviada", icon: TruckIcon },
  SHIPPED: { status: "DELIVERED", label: "Completar pedido", icon: CircleCheckIcon },
};

export function SaleDetailDialog({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { data: sale, isPending } = useResourceDetail(salesResource, saleId);

  return (
    <Dialog open={Boolean(saleId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-5 pr-12">
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle className="text-lg">{sale ? `Gestionar venta #${sale.number}` : "Cargando venta…"}</DialogTitle>
            {sale && <SaleStatusBadge status={sale.status} />}
          </div>
          <DialogDescription>
            {sale
              ? `Registrada el ${formatDateTime(sale.createdAt)}${sale.createdBy ? ` por ${sale.createdBy.name}` : ""}`
              : "Obteniendo el detalle de la venta."}
          </DialogDescription>
        </DialogHeader>

        {isPending || !sale ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-14 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <StatusProgress status={sale.status} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Panel icon={UserIcon} title="Cliente">
                  <InfoRow icon={UserIcon} value={sale.customerName} strong />
                  <InfoRow icon={MailIcon} value={sale.customerEmail} href={`mailto:${sale.customerEmail}`} />
                  <InfoRow icon={PhoneIcon} value={sale.customerPhone} href={`tel:${sale.customerPhone}`} />
                  {sale.notes && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{sale.notes}</p>
                  )}
                </Panel>
                <PaymentPanel sale={sale} />
              </div>

              <Panel icon={MapPinIcon} title="Envío">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="font-medium">{sale.shippingAddress ?? "Sin dirección registrada"}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-muted-foreground">Tracking</p>
                    <p className="font-mono font-medium">{sale.trackingNumber ?? "—"}</p>
                  </div>
                </div>
              </Panel>

              <Panel icon={ReceiptTextIcon} title={`Productos (${sale.items.length})`}>
                <ul className="-mx-1 divide-y">
                  {sale.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4 px-1 py-2.5">
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
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(sale.total)}</span>
                </div>
              </Panel>

              <Panel icon={HistoryIcon} title="Historial de cambios">
                <StatusTimeline history={sale.statusHistory} />
              </Panel>
            </div>

            <SaleActions key={`${sale.id}-${sale.status}`} sale={sale} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusProgress({ status }: { status: SaleStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <BanIcon className="size-5 shrink-0 text-destructive" />
        <p>
          <span className="font-medium text-destructive">Venta cancelada.</span>{" "}
          <span className="text-muted-foreground">No admite más cambios de estado.</span>
        </p>
      </div>
    );
  }
  const current = FLOW.indexOf(status);
  return (
    <ol className="flex items-start rounded-xl border bg-muted/30 px-2 py-4" aria-label="Progreso del pedido">
      {FLOW.map((step, index) => {
        const done = index < current || status === "DELIVERED";
        const active = index === current && status !== "DELIVERED";
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {index > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2",
                  index <= current ? "bg-brand" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 place-items-center rounded-full border-2 bg-background text-xs font-semibold",
                done && "border-brand bg-brand text-white",
                active && "border-brand text-brand ring-4 ring-brand/15",
                !done && !active && "border-border text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                "px-1 text-[11px] leading-tight sm:text-xs",
                done || active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {saleStatusMeta[step].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * El pago acompaña al estado de la venta (ver `paymentStatusAfter`). A mano solo se registra
 * un pago fallido mientras la venta está pendiente.
 */
function PaymentPanel({ sale }: { sale: SaleDetail }) {
  const updatePayment = useUpdatePaymentStatus();
  const failed = sale.paymentStatus === "FAILED";
  return (
    <Panel icon={CreditCardIcon} title="Pago">
      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Método</dt>
          <dd className="font-medium">{paymentMethodLabels[sale.paymentMethod]}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Estado</dt>
          <dd>
            <PaymentStatusBadge status={sale.paymentStatus} />
          </dd>
        </div>
        {sale.status === "PENDING" && (
          <Button
            variant="ghost"
            size="sm"
            className={cn("-mx-2 h-auto px-2 py-1 text-xs", !failed && "text-destructive hover:text-destructive")}
            disabled={updatePayment.isPending}
            onClick={() => updatePayment.mutate({ id: sale.id, paymentStatus: failed ? "PENDING" : "FAILED" })}
          >
            {failed ? <RotateCcwIcon /> : <CircleAlertIcon />}
            {failed ? "Volver a pendiente de pago" : "Registrar pago fallido"}
          </Button>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatCurrency(sale.total)}</dd>
        </div>
      </dl>
    </Panel>
  );
}

function StatusTimeline({ history }: { history: SaleDetail["statusHistory"] }) {
  if (history.length === 0) {
    return <p className="text-muted-foreground">Sin cambios registrados.</p>;
  }
  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-border">
      {history.map((entry, index) => {
        const isCreation = index === history.length - 1 && entry.status === "PENDING";
        return (
          <li key={entry.id} className="relative flex gap-3 pl-6">
            <span
              aria-hidden
              className={cn(
                "absolute top-1 left-0 size-[15px] rounded-full border-2 border-background",
                index === 0 ? "bg-brand" : "bg-muted-foreground/40",
              )}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SaleStatusBadge status={entry.status} />
                <time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>
                  {formatDateTime(entry.createdAt)}
                </time>
              </div>
              {(entry.note || isCreation) && <p>{entry.note ?? "Venta registrada"}</p>}
              {entry.changedBy && <p className="text-xs text-muted-foreground">Por {entry.changedBy.name}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SaleActions({ sale }: { sale: SaleDetail }) {
  const updateStatus = useUpdateSaleStatus();
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState(sale.trackingNumber ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = NEXT_STEP[sale.status];

  if (!next) {
    return (
      <div className="border-t bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        {sale.status === "DELIVERED"
          ? "Pedido completado: las ventas entregadas no cambian de estado."
          : "Las ventas canceladas no cambian de estado."}
      </div>
    );
  }

  const change = (status: SaleStatus) =>
    updateStatus.mutateAsync({
      id: sale.id,
      status,
      note: note.trim() || null,
      trackingNumber: status === "SHIPPED" ? tracking.trim() || null : null,
    });
  const NextIcon = next.icon;
  const canCancel = canTransitionSale(sale.status, "CANCELLED");

  return (
    <div className="space-y-4 border-t bg-muted/30 px-5 py-4">
      <div className={cn("grid gap-4", next.status === "SHIPPED" && "sm:grid-cols-[1fr_14rem]")}>
        <div className="space-y-2">
          <Label htmlFor="status-note">Nota para el cambio de estado (opcional)</Label>
          <Textarea
            id="status-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: el cliente pidió entrega por la tarde…"
            className="resize-none bg-background"
          />
        </div>
        {next.status === "SHIPPED" && (
          <div className="space-y-2">
            <Label htmlFor="status-tracking">N° de tracking</Label>
            <Input
              id="status-tracking"
              maxLength={100}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Opcional"
              className="bg-background font-mono"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {canCancel ? (
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={updateStatus.isPending}
            onClick={() => setConfirmCancel(true)}
          >
            <BanIcon /> Cancelar venta
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground sm:mr-auto">Una venta enviada ya no se puede cancelar.</p>
        )}
        <Button disabled={updateStatus.isPending} onClick={() => change(next.status).catch(() => {})}>
          {updateStatus.isPending ? <Spinner /> : <NextIcon />}
          {next.label}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={`¿Cancelar la venta #${sale.number}?`}
        description={
          sale.paymentStatus === "PAID"
            ? "La venta quedará cancelada y el pago se registrará como reembolsado. No se puede deshacer."
            : "La venta quedará cancelada y no podrá volver a cambiar de estado."
        }
        confirmLabel="Cancelar venta"
        destructive
        isPending={updateStatus.isPending}
        onConfirm={() => change("CANCELLED")}
      />
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-7 place-items-center rounded-md bg-brand/10 text-brand">
          <Icon className="size-4" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  value,
  href,
  strong,
}: {
  icon: LucideIcon;
  value: string | null;
  href?: string;
  strong?: boolean;
}) {
  return (
    <p className={cn("flex items-center gap-2 break-all", !value && "text-muted-foreground")}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {value && href ? (
        <a href={href} className="hover:underline">
          {value}
        </a>
      ) : (
        <span className={cn(strong && "font-medium")}>{value ?? "No registrado"}</span>
      )}
    </p>
  );
}
