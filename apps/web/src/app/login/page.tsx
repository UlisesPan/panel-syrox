import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <AuthShell title="Iniciá sesión" description="Ingresá a tu cuenta para continuar">
      <LoginForm />
    </AuthShell>
  );
}
