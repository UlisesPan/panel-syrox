"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Delivery, DeliveryConfirmInput } from "@panel/shared";
import { apiFetch } from "@/lib/api-client";

export type DeliveryTab = "SHIPPED" | "DELIVERED";

const deliveriesKey = ["deliveries"] as const;

export function useDeliveries(status: DeliveryTab) {
  return useQuery({
    queryKey: [...deliveriesKey, status],
    queryFn: ({ signal }) => apiFetch<Delivery[]>("/deliveries", { params: { status }, signal }),
    // El viajante está en la calle: se refresca al volver a la pestaña y cada minuto.
    refetchInterval: 60_000,
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: DeliveryConfirmInput & { id: string; number: number }) =>
      apiFetch<void>(`/deliveries/${id}/confirm`, { method: "POST", body }),
    onSuccess: (_, { number }) => toast.success(`Pedido #${number} entregado`),
    // Un código incorrecto también cambia el estado (intentos restantes): se refresca siempre.
    onSettled: () => queryClient.invalidateQueries({ queryKey: deliveriesKey }),
  });
}
