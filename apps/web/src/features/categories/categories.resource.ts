"use client";

import { useQuery } from "@tanstack/react-query";
import type { Category, CategoryInput, EntityRef } from "@panel/shared";
import { apiFetch } from "@/lib/api-client";
import { defineResource } from "@/lib/resource";

export const categoriesResource = defineResource<Category, CategoryInput>({
  key: "categories",
  endpoint: "/categories",
  labels: { singular: "Categoría", plural: "Categorías", gender: "f" },
  // Los productos muestran el nombre de su categoría.
  invalidates: ["products"],
});

export type CategoryOption = EntityRef & { parentId: string | null };

/** Todas las categorías para selects (cacheadas 1 min; se invalidan al editar categorías). */
export function useCategoryOptions() {
  return useQuery({
    queryKey: categoriesResource.queryKeys.options,
    queryFn: () => apiFetch<CategoryOption[]>("/categories/options"),
    staleTime: 60_000,
  });
}
