"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SortOrder = "asc" | "desc";
type ParamValue = string | number | null | undefined;

export interface ListState<F extends string> {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortOrder: SortOrder;
  filters: Partial<Record<F, string>>;
}

/**
 * Estado de un listado (página, búsqueda, orden y filtros) sincronizado con la URL.
 * Ventajas: se puede compartir el link, el botón "atrás" funciona y al recargar no se pierde nada.
 */
export function useListParams<F extends string = never>(
  options: { pageSize?: number; sortBy?: string; sortOrder?: SortOrder; filterKeys?: readonly F[] } = {},
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { filterKeys, pageSize: defaultPageSize = 10, sortBy: defaultSortBy, sortOrder: defaultSortOrder = "asc" } =
    options;

  const state = useMemo<ListState<F>>(() => {
    const filters = {} as Partial<Record<F, string>>;
    for (const key of filterKeys ?? []) {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    }
    const hasSort = searchParams.has("sortBy");
    return {
      page: Math.max(1, Number(searchParams.get("page")) || 1),
      pageSize: Number(searchParams.get("pageSize")) || defaultPageSize,
      search: searchParams.get("search") ?? "",
      sortBy: hasSort ? searchParams.get("sortBy")! : defaultSortBy,
      sortOrder: hasSort ? (searchParams.get("sortOrder") as SortOrder) || "asc" : defaultSortOrder,
      filters,
    };
  }, [searchParams, filterKeys, defaultPageSize, defaultSortBy, defaultSortOrder]);

  const setParams = useCallback(
    (patch: Record<string, ParamValue>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      // Cualquier cambio que no sea de página vuelve a la página 1.
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  /** Ciclo de orden por columna: asc → desc → sin orden. */
  const toggleSort = useCallback(
    (key: string) => {
      if (state.sortBy !== key) return setParams({ sortBy: key, sortOrder: "asc" });
      if (state.sortOrder === "asc") return setParams({ sortBy: key, sortOrder: "desc" });
      setParams({ sortBy: null, sortOrder: null });
    },
    [state.sortBy, state.sortOrder, setParams],
  );

  const resetFilters = useCallback(() => {
    setParams(Object.fromEntries([...(filterKeys ?? []), "search"].map((k) => [k, null])));
  }, [filterKeys, setParams]);

  /** Params listos para mandar a la API. */
  const queryParams = useMemo(
    () => ({
      page: state.page,
      pageSize: state.pageSize,
      search: state.search || undefined,
      sortBy: state.sortBy,
      sortOrder: state.sortBy ? state.sortOrder : undefined,
      ...state.filters,
    }),
    [state],
  );

  return { state, queryParams, setParams, toggleSort, resetFilters };
}
