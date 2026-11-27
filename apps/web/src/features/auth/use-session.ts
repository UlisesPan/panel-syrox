"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { LoginInput, ProfileUpdateInput, SessionUser } from "@panel/shared";
import { apiFetch } from "@/lib/api-client";

const sessionKey = ["auth", "me"] as const;

export function useSessionUser() {
  return useQuery({
    queryKey: sessionKey,
    // Una API anterior a los roles no manda `role`: todos sus usuarios eran administradores.
    // Así el panel sigue funcionando si la web se despliega antes que la API.
    queryFn: () =>
      apiFetch<{ user: SessionUser }>("/auth/me").then((r) => ({ ...r.user, role: r.user.role ?? "ADMIN" })),
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<{ user: SessionUser }>("/auth/login", { method: "POST", body: input }),
    onSuccess: ({ user }) => queryClient.setQueryData(sessionKey, { ...user, role: user.role ?? "ADMIN" }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      apiFetch<{ user: SessionUser }>("/auth/profile", { method: "PATCH", body: input }),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(sessionKey, { ...user, role: user.role ?? "ADMIN" });
      // El nombre del usuario aparece en ventas e historial.
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiFetch<void>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      // Se limpia todo el cache: el próximo usuario no debe ver datos del anterior.
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });
}
