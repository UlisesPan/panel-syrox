"use client";

import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRoundIcon, StoreIcon, UserIcon, type LucideIcon } from "lucide-react";
import { changePasswordSchema, type ChangePasswordInput } from "@panel/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import { PageHeader } from "@/components/crud/page-header";
import { StoreLogo } from "@/components/brand/store-logo";
import { siteConfig } from "@/config/site";
import { useSessionUser } from "@/features/auth/use-session";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime, initials } from "@/lib/format";
import { handleFormError } from "@/lib/form-errors";

export function SettingsView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Tu cuenta y los datos de la tienda." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <AccountCard />
          <ChangePasswordCard />
        </div>
        <StoreCard />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-md bg-brand/10 text-brand">
        <Icon className="size-4" />
      </span>
      {title}
    </CardTitle>
  );
}

function AccountCard() {
  const { data: user, isPending } = useSessionUser();
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={UserIcon} title="Cuenta" />
      </CardHeader>
      <CardContent>
        {isPending || !user ? (
          <Skeleton className="h-12 w-2/3" />
        ) : (
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const emptyPasswords: ChangePasswordInput = { currentPassword: "", newPassword: "", confirmPassword: "" };

function ChangePasswordCard() {
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: emptyPasswords });
  const change = useMutation({
    mutationFn: (input: ChangePasswordInput) => apiFetch<void>("/auth/password", { method: "PATCH", body: input }),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
      toast.success("Contraseña actualizada");
      form.reset(emptyPasswords);
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={KeyRoundIcon} title="Cambiar contraseña" />
        <CardDescription>Mínimo 8 caracteres, con al menos una letra y un número.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <TextField
              control={form.control}
              name="currentPassword"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
            />
            <TextField
              control={form.control}
              name="newPassword"
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
            />
            <TextField
              control={form.control}
              name="confirmPassword"
              label="Repetir nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
            />
            <FormActions submitLabel="Actualizar contraseña" isPending={change.isPending} />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function StoreCard() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <SectionTitle icon={StoreIcon} title="Tienda" />
        <CardDescription>
          El panel es white-label: estos datos se definen con variables de entorno <code>NEXT_PUBLIC_*</code> al
          desplegar, sin tocar código.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          <StoreRow label="Nombre" value={siteConfig.name} />
          <StoreRow label="Logo" value={<StoreLogo showName={false} />} />
          <StoreRow
            label="Color de marca"
            value={
              <span className="flex items-center gap-2">
                <span className="size-5 rounded-md border bg-brand" aria-hidden />
                <code>{siteConfig.brandColor}</code>
              </span>
            }
          />
          <StoreRow label="Moneda" value={`${siteConfig.currency} · ej: ${formatCurrency(1234.5)}`} />
          <StoreRow label="Idioma y región" value={`${siteConfig.locale} · ej: ${formatDateTime(new Date())}`} />
        </dl>
      </CardContent>
    </Card>
  );
}

function StoreRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
