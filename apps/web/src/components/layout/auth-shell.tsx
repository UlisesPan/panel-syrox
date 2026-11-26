import { Suspense, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreLogo } from "@/components/brand/store-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Layout de las pantallas sin sesión (login y recuperación de contraseña). */
export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="relative grid min-h-svh place-items-center bg-muted/40 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center gap-3 text-center">
          <StoreLogo className="mx-auto" />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense>{children}</Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
