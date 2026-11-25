"use client";

import { useQuery } from "@tanstack/react-query";
import type { Brand, BrandInput, EntityRef } from "@panel/shared";
import { apiFetch } from "@/lib/api-client";
import { defineResource } from "@/lib/resource";

export const brandsResource = defineResource<Brand, BrandInput>({
  key: "brands",
  endpoint: "/brands",
  labels: { singular: "Marca", plural: "Marcas", gender: "f" },
  invalidates: ["products"],
});

export function useBrandOptions() {
  return useQuery({
    queryKey: brandsResource.queryKeys.options,
    queryFn: () => apiFetch<EntityRef[]>("/brands/options"),
    staleTime: 60_000,
  });
}
