"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/form/form-field";
import { apiFetch, getErrorMessage } from "@/lib/api-client";
import { handleFormError } from "@/lib/form-errors";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
  });
  const reset = useMutation({
    mutationFn: (input: ResetPasswordInput) => apiFetch<void>("/auth/reset-password", { method: "POST", body: input }),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values);
      router.replace("/login?reset=1");
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center text-sm">
        <p className="text-muted-foreground">El enlace está incompleto. Pedí uno nuevo para continuar.</p>
        <Button asChild>
          <Link href="/recuperar-contrasena">Pedir un enlace nuevo</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {reset.isError && !form.formState.errors.newPassword && (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <span className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {getErrorMessage(reset.error)}
            </span>
            <Link href="/recuperar-contrasena" className="font-medium underline">
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
        <TextField
          control={form.control}
          name="newPassword"
          type="password"
          label="Nueva contraseña"
          autoComplete="new-password"
          autoFocus
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          type="password"
          label="Repetir contraseña"
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, con al menos una letra y un número.</p>
        <Button type="submit" size="lg" className="w-full" disabled={reset.isPending}>
          {reset.isPending && <Spinner />}
          Guardar contraseña
        </Button>
      </FieldGroup>
    </form>
  );
}
