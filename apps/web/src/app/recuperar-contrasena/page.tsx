import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recuperar contraseña" description="Te enviamos un enlace para elegir una nueva">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
