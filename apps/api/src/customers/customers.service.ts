import { Injectable } from '@nestjs/common';
import type { Customer, ListQuery, Paginated } from '@panel/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';

type CustomerRow = Omit<Customer, 'lastOrderAt'> & { lastOrderAt: Date };

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Clientes agrupados a partir de las ventas (sin tabla propia). */
  async findAll(query: ListQuery): Promise<Paginated<Customer>> {
    const search = query.search ? `%${query.search.replace(/[\\%_]/g, '\\$&')}%` : null;
    const where = search
      ? Prisma.sql`WHERE "customerName" ILIKE ${search} OR "customerEmail" ILIKE ${search}`
      : Prisma.empty;
    // Lista blanca: solo estos fragmentos fijos llegan al ORDER BY.
    const orderBy = resolveOrderBy(
      query,
      {
        name: (dir) => Prisma.raw(`lower(name) ${dir}`),
        ordersCount: (dir) => Prisma.raw(`"ordersCount" ${dir}`),
        totalSpent: (dir) => Prisma.raw(`"totalSpent" ${dir}`),
        lastOrderAt: (dir) => Prisma.raw(`"lastOrderAt" ${dir}`),
      },
      Prisma.raw(`"lastOrderAt" desc`),
    );
    const { skip, take } = paginationArgs(query);
    const grouped = Prisma.sql`
      SELECT
        COALESCE(lower("customerEmail"), 'name:' || lower("customerName")) AS key,
        (array_agg("customerName" ORDER BY "createdAt" DESC))[1] AS name,
        (array_agg("customerEmail" ORDER BY "createdAt" DESC) FILTER (WHERE "customerEmail" IS NOT NULL))[1] AS email,
        (array_agg("customerPhone" ORDER BY "createdAt" DESC) FILTER (WHERE "customerPhone" IS NOT NULL))[1] AS phone,
        count(*)::int AS "ordersCount",
        COALESCE(round(sum(total) FILTER (WHERE status <> 'CANCELLED'), 2), 0)::float8 AS "totalSpent",
        max("createdAt") AS "lastOrderAt"
      FROM "Sale"
      ${where}
      GROUP BY 1`;

    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<CustomerRow[]>`${grouped} ORDER BY ${orderBy}, key LIMIT ${take} OFFSET ${skip}`,
      this.prisma.$queryRaw<[{ total: number }]>`SELECT count(*)::int AS total FROM (${grouped}) AS c`,
    ]);
    return toPaginated(
      rows.map((r) => ({ ...r, lastOrderAt: r.lastOrderAt.toISOString() })),
      total,
      query,
    );
  }
}
