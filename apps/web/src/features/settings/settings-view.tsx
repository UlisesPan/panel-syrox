"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRoundIcon, UserIcon, type LucideIcon } from "lucide-react";
import { changePasswordSchema, profileUpdateSchema, type ChangePasswordInput, type SessionUser } from "@panel/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import { PageHeader } from "@/components/crud/page-header";
import { useSessionUser, useUpdateProfile } from "@/features/auth/use-session";
import { apiFetch } from "@/lib/api-client";
import { initials } from "@/lib/format";
import { handleFormError } from "@/lib/form-errors";

export function SettingsView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Datos de tu cuenta y seguridad." />
      <div className="grid max-w-2xl gap-6">
        <AccountCard />
        <ChangePasswordCard />
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
        <CardDescription>Tu email también se usa para recuperar la contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending || !user ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <ProfileForm key={`${user.name}|${user.email}`} user={user} />
        )}
      </CardContent>
    </Card>
  );
}

function ProfileForm({ user }: { user: SessionUser }) {
  const updateProfile = useUpdateProfile();
  const form = useForm({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: user.name, email: user.email, currentPassword: "" },
  });
  const email = useWatch({ control: form.control, name: "email" });
  const emailChanged = email.trim().toLowerCase() !== user.email;

  const submit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({ ...values, currentPassword: emailChanged ? values.currentPassword : undefined });
      toast.success("Perfil actualizado");
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="name" label="Nombre" autoComplete="name" required />
          <TextField control={form.control} name="email" type="email" label="Email" autoComplete="email" required />
        </div>
        {emailChanged && (
          <TextField
            control={form.control}
            name="currentPassword"
            type="password"
            label="Contraseña actual"
            description="Necesaria para confirmar el cambio de email."
            autoComplete="current-password"
            required
          />
        )}
        <FormActions
          submitLabel="Guardar cambios"
          isPending={updateProfile.isPending}
          disabled={!form.formState.isDirty}
        />
      </FieldGroup>
    </form>
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
        <CardDescription>
          Mínimo 8 caracteres, con al menos una letra y un número. Se cierra la sesión en tus otros dispositivos.
        </CardDescription>
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

