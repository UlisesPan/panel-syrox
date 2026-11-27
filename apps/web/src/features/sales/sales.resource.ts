"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Customer,
  ManualPaymentStatus,
  Paginated,
  Sale,
  SaleDetail,
  SaleInput,
  SaleProductOption,
  SaleStatusUpdateInput,
  User,
} from "@panel/shared";
import { apiFetch, getErrorMessage } from "@/lib/api-client";
import { defineResource } from "@/lib/resource";
import { paymentStatusMeta, saleStatusMeta } from "@/lib/labels";

export const salesResource = defineResource<Sale, SaleInput, SaleDetail>({
  key: "sales",
  endpoint: "/sales",
  labels: { singular: "Venta", plural: "Ventas", gender: "f" },
  invalidates: ["dashboard", "customers"],
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

function useSaleMutation<TBody extends object>(
  path: string,
  successMessage: (sale: SaleDetail) => string,
  method: "PATCH" | "POST" = "PATCH",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & TBody) =>
      apiFetch<SaleDetail>(`/sales/${id}/${path}`, { method, body }),
    onSuccess: async (sale) => {
      toast.success(successMessage(sale));
      queryClient.setQueryData(salesResource.queryKeys.detail(sale.id), sale);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesResource.queryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
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

/** Clientes de ventas anteriores para autocompletar "Generar venta". */
export function useCustomerSearch(search: string) {
  return useQuery({
    queryKey: ["customers", "search", search],
    queryFn: ({ signal }) =>
      apiFetch<Paginated<Customer>>("/customers", {
        params: { search: search || undefined, pageSize: 8, sortBy: "lastOrderAt", sortOrder: "desc" },
        signal,
      }),
    select: (page) => page.data,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useUpdatePaymentStatus() {
  return useSaleMutation<{ paymentStatus: ManualPaymentStatus }>(
    "payment",
    (sale) => `Venta #${sale.number}: pago ${paymentStatusMeta[sale.paymentStatus].label.toLowerCase()}`,
  );
}

export function useResendDeliveryCode() {
  return useSaleMutation<object>(
    "delivery-code",
    (sale) => `Venta #${sale.number}: código nuevo enviado a ${sale.customerEmail}`,
    "POST",
  );
}

/** Viajantes disponibles para asignar un envío. */
export function useCouriers(enabled = true) {
  return useQuery({
    queryKey: ["users", "couriers"],
    queryFn: () =>
      apiFetch<Paginated<User>>("/users", { params: { role: "COURIER", pageSize: 100, sortBy: "name", sortOrder: "asc" } }),
    select: (page) => page.data,
    enabled,
    staleTime: 60_000,
  });
}
