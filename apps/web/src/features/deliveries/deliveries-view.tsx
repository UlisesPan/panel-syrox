"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleCheckIcon,
  ClockIcon,
  KeyRoundIcon,
  MapPinIcon,
  NavigationIcon,
  PackageCheckIcon,
  PhoneIcon,
  TruckIcon,
} from "lucide-react";
import { z } from "zod";
import type { Delivery, DeliveryConfirmInput } from "@panel/shared";
import { PageHeader } from "@/components/crud/page-header";
import { FormField, TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionUser } from "@/features/auth/use-session";
import { handleFormError } from "@/lib/form-errors";
import { formatCurrency, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConfirmDelivery, useDeliveries, type DeliveryTab } from "./deliveries.resource";

const mapsHref = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Vista del viajante: sus envíos en curso y los que ya entregó. Pensada primero para el celular. */
export function DeliveriesView() {
  const { data: user } = useSessionUser();
  const [tab, setTab] = useState<DeliveryTab>("SHIPPED");
  const [confirming, setConfirming] = useState<Delivery | null>(null);
  const pending = useDeliveries("SHIPPED");
  const delivered = useDeliveries("DELIVERED");
  const current = tab === "SHIPPED" ? pending : delivered;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis entregas"
        description={`Hola${user ? ` ${user.name.split(" ")[0]}` : ""}: estos son los pedidos que tenés asignados.`}
      />

      <div role="tablist" aria-label="Estado de las entregas" className="inline-flex rounded-lg border bg-muted/40 p-1">
        {(
          [
            ["SHIPPED", "Por entregar", pending.data?.length],
            ["DELIVERED", "Entregadas", undefined],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] text-white">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {current.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : current.data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {current.data.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery} onConfirm={() => setConfirming(delivery)} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">{tab === "SHIPPED" ? <TruckIcon /> : <PackageCheckIcon />}</EmptyMedia>
                <EmptyTitle>{tab === "SHIPPED" ? "No tenés entregas pendientes" : "Todavía no entregaste pedidos"}</EmptyTitle>
                <EmptyDescription>
                  {tab === "SHIPPED"
                    ? "Cuando administración te asigne un envío, aparece acá."
                    : "Acá vas a ver los últimos pedidos que confirmaste."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      )}

      <ConfirmDeliveryDialog delivery={confirming} onClose={() => setConfirming(null)} />
    </div>
  );
}

function DeliveryCard({ delivery, onConfirm }: { delivery: Delivery; onConfirm: () => void }) {
  const pending = delivery.status === "SHIPPED";
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Pedido #{delivery.number}</p>
          <p className="truncate text-lg font-semibold">{delivery.customerName}</p>
        </div>
        {pending ? (
          <Badge variant="info" className="shrink-0">
            <ClockIcon /> {delivery.shippedAt ? `Salió ${formatRelative(delivery.shippedAt)}` : "En camino"}
          </Badge>
        ) : (
          <Badge variant="success" className="shrink-0">
            <CircleCheckIcon /> {delivery.deliveredAt ? `Entregado ${formatRelative(delivery.deliveredAt)}` : "Entregado"}
          </Badge>
        )}
      </div>

      <CardContent className="space-y-4 px-5 py-4 text-sm">
        <div className="space-y-2">
          <p className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{delivery.shippingAddress ?? "Sin dirección registrada"}</span>
          </p>
          {delivery.customerPhone && (
            <p className="flex items-center gap-2">
              <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
              <a href={`tel:${delivery.customerPhone}`} className="hover:underline">
                {delivery.customerPhone}
              </a>
            </p>
          )}
          {delivery.notes && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{delivery.notes}</p>
          )}
        </div>

        <ul className="divide-y rounded-lg border">
          {delivery.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">{item.productName}</span>
                {item.variantLabel && <span className="text-xs text-muted-foreground">{item.variantLabel}</span>}
              </span>
              <span className="shrink-0 font-medium tabular-nums">×{item.quantity}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total del pedido (ya cobrado)</span>
          <span className="font-semibold tabular-nums">{formatCurrency(delivery.total)}</span>
        </div>
      </CardContent>

      {pending && (
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row">
          {delivery.shippingAddress && (
            <Button variant="outline" className="sm:flex-1" asChild>
              <a href={mapsHref(delivery.shippingAddress)} target="_blank" rel="noreferrer">
                <NavigationIcon /> Cómo llegar
              </a>
            </Button>
          )}
          {delivery.customerPhone && (
            <Button variant="outline" className="sm:hidden" asChild>
              <a href={`tel:${delivery.customerPhone}`}>
                <PhoneIcon /> Llamar
              </a>
            </Button>
          )}
          <Button className="sm:flex-1" onClick={onConfirm}>
            <PackageCheckIcon /> Confirmar entrega
          </Button>
        </div>
      )}
    </Card>
  );
}

/** El formato del código se valida acá; que sea el correcto lo decide la API (y cuenta los intentos). */
const withCodeSchema = z.object({
  code: z.string().regex(/^\d{4}$/, "Ingresá los 4 números del código"),
  receivedBy: z.string().trim().max(120),
});
const withoutCodeSchema = withCodeSchema.extend({ code: z.string() });
type ConfirmValues = z.infer<typeof withCodeSchema>;

function ConfirmDeliveryDialog({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(delivery)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar entrega #{delivery?.number}</DialogTitle>
          <DialogDescription>
            {delivery?.requiresCode
              ? `Pedile a ${delivery.customerName} el código de 4 números que recibió por mail.`
              : "Este pedido no tiene código de entrega: confirmá cuando lo entregues."}
          </DialogDescription>
        </DialogHeader>
        {delivery && <ConfirmDeliveryForm key={delivery.id} delivery={delivery} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeliveryForm({ delivery, onDone }: { delivery: Delivery; onDone: () => void }) {
  const confirm = useConfirmDelivery();
  const form = useForm<ConfirmValues>({
    resolver: zodResolver(delivery.requiresCode ? withCodeSchema : withoutCodeSchema),
    defaultValues: { code: "", receivedBy: "" },
  });
  const blocked = delivery.requiresCode && delivery.attemptsLeft === 0;

  const submit = form.handleSubmit(async (values) => {
    try {
      const body: DeliveryConfirmInput = {
        code: delivery.requiresCode ? values.code : null,
        receivedBy: values.receivedBy || null,
      };
      await confirm.mutateAsync({ id: delivery.id, number: delivery.number, ...body });
      onDone();
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });
  // El error de la API ya dice los intentos restantes: no se repite el contador viejo.
  const codeError = form.formState.errors.code;

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {delivery.requiresCode && (
          <FormField
            control={form.control}
            name="code"
            label="Código de entrega"
            description={
              codeError
                ? undefined
                : blocked
                  ? "Se agotaron los intentos. Pedile a administración que le reenvíe el código al cliente."
                  : `Te ${delivery.attemptsLeft === 1 ? "queda 1 intento" : `quedan ${delivery.attemptsLeft} intentos`}.`
            }
            render={(field, { id, invalid }) => (
              <div className="relative">
                <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  {...field}
                  id={id}
                  aria-invalid={invalid}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  autoFocus
                  disabled={blocked}
                  placeholder="0000"
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-14 text-center font-mono text-3xl tracking-[0.5em] md:text-3xl"
                />
              </div>
            )}
          />
        )}
        <TextField
          control={form.control}
          name="receivedBy"
          label="¿Quién lo recibió?"
          placeholder="Opcional, ej: el titular, un familiar, portería…"
          autoFocus={!delivery.requiresCode}
        />
        <FormActions
          submitLabel="Confirmar entrega"
          isPending={confirm.isPending}
          disabled={blocked}
          onCancel={onDone}
        />
      </FieldGroup>
    </form>
  );
}
