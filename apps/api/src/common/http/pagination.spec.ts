import { describe, expect, it } from 'vitest';
import { listQuerySchema } from '@panel/shared';
import { paginationArgs, resolveOrderBy, toPaginated } from './pagination.js';

const query = (input: Record<string, unknown> = {}) => listQuerySchema.parse(input);

describe('paginationArgs', () => {
  it('calcula skip/take a partir de page y pageSize', () => {
    expect(paginationArgs(query({ page: '3', pageSize: '20' }))).toEqual({ skip: 40, take: 20 });
  });
});

describe('toPaginated', () => {
  it('calcula el total de páginas (mínimo 1)', () => {
    expect(toPaginated([], 0, query()).meta.totalPages).toBe(1);
    expect(toPaginated([], 21, query({ pageSize: 10 })).meta.totalPages).toBe(3);
  });
});

describe('resolveOrderBy', () => {
  type OrderBy = { name?: 'asc' | 'desc'; id?: 'asc' | 'desc' };
  const sortable = { name: (dir: 'asc' | 'desc'): OrderBy => ({ name: dir }) };

  it('usa la columna permitida con la dirección pedida', () => {
    expect(resolveOrderBy<OrderBy>(query({ sortBy: 'name', sortOrder: 'desc' }), sortable, { id: 'asc' })).toEqual({
      name: 'desc',
    });
  });

  it('ignora columnas fuera de la lista blanca', () => {
    expect(resolveOrderBy<OrderBy>(query({ sortBy: 'passwordHash' }), sortable, { id: 'asc' })).toEqual({ id: 'asc' });
  });
});
