import type { Sale } from './sale.js';

export interface DashboardSummary {
  products: { total: number; active: number };
  categories: number;
  brands: number;
  sales: {
    count: number;
    revenue: number;
    averageTicket: number;
  };
  /** Últimos 30 días, un punto por día (incluye días sin ventas). */
  revenueByDay: Array<{ date: string; revenue: number; count: number }>;
  recentSales: Sale[];
  topProducts: Array<{ productId: string | null; name: string; quantity: number; revenue: number }>;
}
