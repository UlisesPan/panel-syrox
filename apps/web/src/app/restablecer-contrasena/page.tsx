import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Nueva contraseña" description="Elegí la contraseña con la que vas a ingresar">
      <ResetPasswordForm />
    </AuthShell>
  );
}
