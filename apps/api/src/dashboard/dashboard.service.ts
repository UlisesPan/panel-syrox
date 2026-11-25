import { Injectable } from '@nestjs/common';
import type { DashboardSummary } from '@panel/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toSaleDto } from '../sales/sales.service.js';

const DAYS = 30;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<DashboardSummary> {
    // Las ventas canceladas no suman a los ingresos.
    const validSales = { status: { not: 'CANCELLED' as const } };
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const [productsTotal, productsActive, categories, brands, salesAgg, recentSales, byDay, topProducts] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: 'ACTIVE' } }),
        this.prisma.category.count(),
        this.prisma.brand.count(),
        this.prisma.sale.aggregate({ where: validSales, _count: true, _sum: { total: true } }),
        this.prisma.sale.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { _count: { select: { items: true } } },
        }),
        this.prisma.$queryRaw<Array<{ day: Date; revenue: string; count: bigint }>>`
          SELECT date_trunc('day', "createdAt") AS day, SUM(total)::text AS revenue, COUNT(*) AS count
          FROM "Sale"
          WHERE status <> 'CANCELLED' AND "createdAt" >= ${since}
          GROUP BY 1
          ORDER BY 1`,
        this.prisma.$queryRaw<Array<{ productId: string | null; name: string; quantity: bigint; revenue: string }>>`
          SELECT si."productId", MAX(si."productName") AS name, SUM(si.quantity) AS quantity, SUM(si.subtotal)::text AS revenue
          FROM "SaleItem" si
          JOIN "Sale" s ON s.id = si."saleId"
          WHERE s.status <> 'CANCELLED'
          GROUP BY si."productId"
          ORDER BY quantity DESC
          LIMIT 5`,
      ]);

    const revenue = Number(salesAgg._sum.total ?? 0);
    const count = salesAgg._count;

    // Rellenamos los días sin ventas para que el gráfico tenga una serie continua.
    const byDayMap = new Map(byDay.map((r) => [r.day.toISOString().slice(0, 10), r]));
    const revenueByDay = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      const row = byDayMap.get(key);
      return { date: key, revenue: row ? Number(row.revenue) : 0, count: row ? Number(row.count) : 0 };
    });

    return {
      products: { total: productsTotal, active: productsActive },
      categories,
      brands,
      sales: {
        count,
        revenue,
        averageTicket: count ? Math.round((revenue / count) * 100) / 100 : 0,
      },
      revenueByDay,
      recentSales: recentSales.map(toSaleDto),
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: p.productId ? p.name : `${p.name} (eliminado)`,
        quantity: Number(p.quantity),
        revenue: Number(p.revenue),
      })),
    };
  }
}
