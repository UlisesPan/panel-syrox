"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  PaymentStatus,
  Sale,
  SaleDetail,
  SaleInput,
  SaleProductOption,
  SaleStatusUpdateInput,
} from "@panel/shared";
import { apiFetch, getErrorMessage } from "@/lib/api-client";
import { defineResource } from "@/lib/resource";
import { paymentStatusMeta, saleStatusMeta } from "@/lib/labels";

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

function useSaleMutation<TBody extends object>(path: string, successMessage: (sale: SaleDetail) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & TBody) =>
      apiFetch<SaleDetail>(`/sales/${id}/${path}`, { method: "PATCH", body }),
    onSuccess: async (sale) => {
      toast.success(successMessage(sale));
      queryClient.setQueryData(salesResource.queryKeys.detail(sale.id), sale);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesResource.queryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateSaleStatus() {
  return useSaleMutation<SaleStatusUpdateInput>(
    "status",
    (sale) => `Venta #${sale.number}: ${saleStatusMeta[sale.status].label.toLowerCase()}`,
  );
}

export function useUpdatePaymentStatus() {
  return useSaleMutation<{ paymentStatus: PaymentStatus }>(
    "payment",
    (sale) => `Venta #${sale.number}: pago ${paymentStatusMeta[sale.paymentStatus].label.toLowerCase()}`,
  );
}
