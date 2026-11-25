"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon } from "lucide-react";
import { loginSchema } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/form/form-field";
import { getErrorMessage } from "@/lib/api-client";
import { useLogin } from "./use-session";

/** Solo se permiten redirecciones internas (evita open redirects tipo ?next=https://malicioso.com). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch {
      form.resetField("password", { keepError: false });
      form.setFocus("password");
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {login.isError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircleIcon className="size-4 shrink-0" />
            {getErrorMessage(login.error)}
          </div>
        )}
        <TextField
          control={form.control}
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="ejemplo@mail.com"
          autoComplete="email"
          autoFocus
        />
        <TextField
          control={form.control}
          name="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
        />
        <Controller
          control={form.control}
          name="remember"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="remember"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <FieldLabel htmlFor="remember" className="font-normal">
                Mantener sesión iniciada
              </FieldLabel>
            </Field>
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending && <Spinner />}
          Ingresar
        </Button>
      </FieldGroup>
    </form>
  );
}
