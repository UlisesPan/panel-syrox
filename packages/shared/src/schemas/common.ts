import { z } from 'zod';

/**
 * Query estándar para cualquier listado paginado del panel.
 * Todos los recursos comparten este contrato, lo que permite que la tabla
 * genérica del frontend funcione con cualquier endpoint sin configuración extra.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type ListQueryInput = z.input<typeof listQuerySchema>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Forma única de los errores que devuelve la API. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  errors?: Array<{ path: string; message: string }>;
}

/** Referencia liviana a otra entidad (para selects, badges, etc). */
export interface EntityRef {
  id: string;
  name: string;
}
