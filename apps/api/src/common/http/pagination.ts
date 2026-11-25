import type { ListQuery, Paginated } from '@panel/shared';

/** skip/take de Prisma a partir de la query estándar de listados. */
export function paginationArgs(query: ListQuery) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function toPaginated<T>(data: T[], total: number, query: ListQuery): Paginated<T> {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

type SortDirection = 'asc' | 'desc';

/**
 * Traduce `sortBy` a un `orderBy` de Prisma usando una lista blanca por recurso.
 * Evita que el cliente pueda ordenar por campos arbitrarios (o inexistentes).
 */
export function resolveOrderBy<T>(
  query: ListQuery,
  sortable: Record<string, (direction: SortDirection) => T>,
  fallback: T,
): T {
  const builder = query.sortBy ? sortable[query.sortBy] : undefined;
  return builder ? builder(query.sortOrder) : fallback;
}

/** Filtro de búsqueda case-insensitive sobre un campo de texto. */
export function containsInsensitive(search?: string) {
  return search ? { contains: search, mode: 'insensitive' as const } : undefined;
}
