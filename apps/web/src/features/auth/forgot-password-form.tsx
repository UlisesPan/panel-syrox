"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailCheckIcon } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/form/form-field";
import { apiFetch } from "@/lib/api-client";
import { handleFormError } from "@/lib/form-errors";

export function ForgotPasswordForm() {
  const form = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const request = useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiFetch<void>("/auth/forgot-password", { method: "POST", body: input }),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await request.mutateAsync(values);
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  if (request.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-brand">
          <MailCheckIcon className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Si <span className="font-medium text-foreground">{form.getValues("email")}</span> tiene una cuenta, en unos
          minutos vas a recibir un mail con el enlace. Revisá también la carpeta de spam.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Volver al inicio de sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="ejemplo@mail.com"
          autoComplete="email"
          autoFocus
        />
        <Button type="submit" size="lg" className="w-full" disabled={request.isPending}>
          {request.isPending && <Spinner />}
          Enviar enlace
        </Button>
        <Button asChild variant="link" className="text-muted-foreground">
          <Link href="/login">Volver al inicio de sesión</Link>
        </Button>
      </FieldGroup>
    </form>
  );
}
