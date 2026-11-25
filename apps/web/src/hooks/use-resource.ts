"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { resourceMessages, type ListParams, type Resource } from "@/lib/resource";

/** Listado paginado. Mantiene la página anterior mientras carga la siguiente (sin parpadeos). */
export function useResourceList<TItem, TInput, TDetail>(
  resource: Resource<TItem, TInput, TDetail>,
  params: ListParams,
) {
  return useQuery({
    queryKey: resource.queryKeys.list(params),
    queryFn: ({ signal }) => resource.api.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useResourceDetail<TItem, TInput, TDetail>(
  resource: Resource<TItem, TInput, TDetail>,
  id: string | null | undefined,
) {
  return useQuery({
    queryKey: resource.queryKeys.detail(id ?? ""),
    queryFn: () => resource.api.get(id!),
    enabled: Boolean(id),
  });
}

/**
 * create / update / remove con toasts e invalidación de cache incluidos.
 * Los errores de validación por campo se propagan para que el formulario los muestre.
 */
export function useResourceMutations<TItem, TInput, TDetail>(resource: Resource<TItem, TInput, TDetail>) {
  const queryClient = useQueryClient();
  const messages = resourceMessages(resource.labels);

  const invalidate = () =>
    Promise.all(
      [resource.key, ...(resource.invalidates ?? [])].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );

  const create = useMutation({
    mutationFn: (input: TInput) => resource.api.create(input),
    onSuccess: async () => {
      toast.success(messages.created);
      await invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TInput> }) => resource.api.update(id, input),
    onSuccess: async () => {
      toast.success(messages.updated);
      await invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => resource.api.remove(id),
    onSuccess: async () => {
      toast.success(messages.deleted);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return { create, update, remove, messages };
}
