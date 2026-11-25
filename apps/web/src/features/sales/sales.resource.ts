"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Sale, SaleDetail, SaleInput, SaleProductOption, SaleStatus } from "@panel/shared";
import { apiFetch, getErrorMessage } from "@/lib/api-client";
import { defineResource } from "@/lib/resource";
import { saleStatusMeta } from "@/lib/labels";

export const salesResource = defineResource<Sale, SaleInput, SaleDetail>({
  key: "sales",
  endpoint: "/sales",
  labels: { singular: "Venta", plural: "Ventas", gender: "f" },
  invalidates: ["dashboard"],
});

/** Búsqueda de productos vendibles (activos, con variantes y precio final). */
export function useSaleProductOptions(search: string) {
  return useQuery({
    queryKey: ["products", "sale-options", search],
    queryFn: ({ signal }) =>
      apiFetch<SaleProductOption[]>("/products/sale-options", { params: { search }, signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SaleStatus }) =>
      apiFetch<SaleDetail>(`/sales/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: async (sale) => {
      toast.success(`Venta #${sale.number}: ${saleStatusMeta[sale.status].label.toLowerCase()}`);
      queryClient.setQueryData(salesResource.queryKeys.detail(sale.id), sale);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesResource.queryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
