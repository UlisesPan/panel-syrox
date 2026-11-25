import type { ListQueryInput, Paginated } from "@panel/shared";
import { apiFetch } from "./api-client";

export type ListParams = ListQueryInput & Record<string, string | number | undefined>;

interface ResourceConfig {
  /** Clave de cache de React Query (y prefijo de invalidación). */
  key: string;
  /** Endpoint REST de la API, ej: "/categories". */
  endpoint: string;
  /** Textos para toasts y diálogos. */
  labels: {
    singular: string;
    plural: string;
    /** Concordancia de género para los mensajes: "Categoría creada" / "Producto creado". */
    gender: "m" | "f";
  };
  /** Verbo usado para editar (PATCH parcial o PUT de reemplazo completo). */
  updateMethod?: "PATCH" | "PUT";
  /** Otras claves de cache que quedan desactualizadas cuando este recurso cambia. */
  invalidates?: string[];
}

/**
 * Define un recurso CRUD una sola vez: endpoints, claves de cache y textos.
 * Los hooks genéricos (`useResourceList`, `useResourceMutations`...) y la
 * `CrudPage` trabajan con cualquier recurso definido así.
 */
export function defineResource<TItem, TInput, TDetail = TItem>(config: ResourceConfig) {
  const { key, endpoint } = config;
  return {
    ...config,
    queryKeys: {
      all: [key] as const,
      list: (params: ListParams) => [key, "list", params] as const,
      detail: (id: string) => [key, "detail", id] as const,
      options: [key, "options"] as const,
    },
    api: {
      list: (params: ListParams, signal?: AbortSignal) =>
        apiFetch<Paginated<TItem>>(endpoint, { params, signal }),
      get: (id: string) => apiFetch<TDetail>(`${endpoint}/${id}`),
      create: (body: TInput) => apiFetch<TDetail>(endpoint, { method: "POST", body }),
      update: (id: string, body: Partial<TInput>) =>
        apiFetch<TDetail>(`${endpoint}/${id}`, { method: config.updateMethod ?? "PATCH", body }),
      remove: (id: string) => apiFetch<void>(`${endpoint}/${id}`, { method: "DELETE" }),
    },
  };
}

export type Resource<TItem = unknown, TInput = unknown, TDetail = TItem> = ReturnType<
  typeof defineResource<TItem, TInput, TDetail>
>;

export function resourceMessages(labels: ResourceConfig["labels"]) {
  const o = labels.gender === "f" ? "a" : "o";
  return {
    created: `${labels.singular} cread${o} correctamente`,
    updated: `${labels.singular} actualizad${o} correctamente`,
    deleted: `${labels.singular} eliminad${o} correctamente`,
    newLabel: `Nuev${o} ${labels.singular.toLowerCase()}`,
    editLabel: `Editar ${labels.singular.toLowerCase()}`,
  };
}
