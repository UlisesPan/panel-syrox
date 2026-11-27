"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionUser } from "@/features/auth/use-session";
import { canAccess, homeFor } from "@/config/navigation";

/**
 * Si el rol no tiene acceso a la sección (ej: un viajante que entra a /ventas), lo lleva a su inicio.
 * Es solo UX: la API rechaza con 403 cualquier endpoint que el rol no tenga habilitado.
 */
export function RoleGate({ children }: { children: ReactNode }) {
  const { data: user } = useSessionUser();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = user ? canAccess(user.role, pathname) : false;

  useEffect(() => {
    if (user && !allowed) router.replace(homeFor(user.role));
  }, [user, allowed, router]);

  return allowed ? children : null;
}
