"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { LoginInput, SessionUser } from "@panel/shared";
import { apiFetch } from "@/lib/api-client";

const sessionKey = ["auth", "me"] as const;

export function useSessionUser() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => apiFetch<{ user: SessionUser }>("/auth/me").then((r) => r.user),
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<{ user: SessionUser }>("/auth/login", { method: "POST", body: input }),
    onSuccess: ({ user }) => queryClient.setQueryData(sessionKey, user),
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
