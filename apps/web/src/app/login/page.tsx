import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreLogo } from "@/components/brand/store-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-svh place-items-center bg-muted/40 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center gap-3 text-center">
          <StoreLogo className="mx-auto" />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Iniciá sesión</CardTitle>
            <CardDescription>Ingresá a tu cuenta para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
