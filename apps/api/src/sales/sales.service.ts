import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  saleFiltersSchema,
  saleInputSchema,
  saleStatusUpdateSchema,
  variantLabel,
  type ListQuery,
  type Paginated,
  type PaymentStatus,
  type Sale,
  type SaleDetail,
  type SaleStatus,
  type SessionUser,
} from '@panel/shared';
import type { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';
import { toMoney } from '../common/utils/decimal.js';

type SaleDto = z.output<typeof saleInputSchema>;
type SaleStatusDto = z.output<typeof saleStatusUpdateSchema>;
type SaleListQuery = ListQuery & z.output<typeof saleFiltersSchema>;

/** Estados finales: una venta entregada o cancelada ya no cambia. */
const FINAL_STATUSES: SaleStatus[] = ['DELIVERED', 'CANCELLED'];

const listInclude = { _count: { select: { items: true } } } satisfies Prisma.SaleInclude;
const detailInclude = {
  ...listInclude,
  items: true,
  createdBy: { select: { id: true, name: true } },
  statusHistory: {
    orderBy: { createdAt: 'desc' },
    include: { changedBy: { select: { id: true, name: true } } },
  },
} satisfies Prisma.SaleInclude;

type SaleRow = Prisma.SaleGetPayload<{ include: typeof listInclude }>;
type SaleDetailRow = Prisma.SaleGetPayload<{ include: typeof detailInclude }>;

export const toSaleDto = (s: SaleRow): Sale => ({
  id: s.id,
  number: s.number,
  customerName: s.customerName,
  customerEmail: s.customerEmail,
  customerPhone: s.customerPhone,
  shippingAddress: s.shippingAddress,
  trackingNumber: s.trackingNumber,
  status: s.status,
  paymentMethod: s.paymentMethod,
  paymentStatus: s.paymentStatus,
  notes: s.notes,
  total: toMoney(s.total),
  itemsCount: s._count.items,
  createdAt: s.createdAt.toISOString(),
});

const toDetailDto = (s: SaleDetailRow): SaleDetail => ({
  ...toSaleDto(s),
  createdBy: s.createdBy,
  items: s.items.map((i) => ({
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    productName: i.productName,
    variantLabel: i.variantLabel,
    unitPrice: toMoney(i.unitPrice),
    quantity: i.quantity,
    subtotal: toMoney(i.subtotal),
  })),
  statusHistory: s.statusHistory.map((h) => ({
    id: h.id,
    status: h.status,
    note: h.note,
    changedBy: h.changedBy,
    createdAt: h.createdAt.toISOString(),
  })),
});

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SaleListQuery): Promise<Paginated<Sale>> {
    const search = query.search?.replace(/^#/, '');
    const saleNumber = search && /^\d+$/.test(search) ? Number(search) : undefined;
    const where: Prisma.SaleWhereInput = {
      status: query.status,
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
          ...(saleNumber !== undefined && saleNumber <= 2_147_483_647 ? [{ number: saleNumber }] : []),
        ],
      }),
    };
    const orderBy = resolveOrderBy<Prisma.SaleOrderByWithRelationInput>(
      query,
      {
        number: (dir) => ({ number: dir }),
        customerName: (dir) => ({ customerName: dir }),
        total: (dir) => ({ total: dir }),
        status: (dir) => ({ status: dir }),
        paymentStatus: (dir) => ({ paymentStatus: dir }),
        createdAt: (dir) => ({ createdAt: dir }),
      },
      { createdAt: 'desc' },
    );

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({ where, orderBy, include: listInclude, ...paginationArgs(query) }),
      this.prisma.sale.count({ where }),
    ]);
    return toPaginated(items.map(toSaleDto), total, query);
  }

  async findOne(id: string): Promise<SaleDetail> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: detailInclude });
    if (!sale) throw new NotFoundException('La venta no existe.');
    return toDetailDto(sale);
  }

  /**
   * "Generar venta": los precios se toman SIEMPRE de la base (nunca del cliente)
   * y se guardan como snapshot en cada ítem. Lectura + escritura en una transacción.
   */
  async create(dto: SaleDto, user: SessionUser): Promise<SaleDetail> {
    const sale = await this.prisma.$transaction(async (tx) => {
      const productIds = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const items = dto.items.map((item, index) => {
        const product = byId.get(item.productId);
        if (!product) throw new BadRequestException(`Ítem ${index + 1}: el producto no existe.`);
        if (product.status !== 'ACTIVE') {
          throw new BadRequestException(`"${product.name}" no está activo y no se puede vender.`);
        }

        const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : undefined;
        if (item.variantId && !variant) {
          throw new BadRequestException(`"${product.name}": la variante seleccionada no existe.`);
        }
        if (!variant && product.variants.length > 0) {
          throw new BadRequestException(`"${product.name}": seleccioná una variante.`);
        }

        const unitPrice = variant?.price ?? product.price;
        return {
          productId: product.id,
          variantId: variant?.id ?? null,
          productName: product.name,
          variantLabel: variant ? variantLabel(variant.options as Record<string, string>) : null,
          unitPrice,
          quantity: item.quantity,
          subtotal: unitPrice.mul(item.quantity),
        };
      });

      const total = items.reduce((sum, i) => sum.add(i.subtotal), new Prisma.Decimal(0));

      return tx.sale.create({
        data: {
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus,
          notes: dto.notes,
          total,
          createdById: user.id,
          items: { create: items },
          statusHistory: { create: { status: 'PENDING', changedById: user.id } },
        },
        include: detailInclude,
      });
    });
    return toDetailDto(sale);
  }

  async updateStatus(id: string, dto: SaleStatusDto, user: SessionUser): Promise<SaleDetail> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, select: { status: true, paymentStatus: true } });
    if (!sale) throw new NotFoundException('La venta no existe.');
    if (FINAL_STATUSES.includes(sale.status)) {
      throw new BadRequestException('La venta ya está finalizada y no puede cambiar de estado.');
    }
    if (dto.status === sale.status) {
      throw new BadRequestException('La venta ya está en ese estado.');
    }
    const updated = await this.prisma.sale.update({
      where: { id },
      data: {
        status: dto.status,
        // Marcar la venta como pagada actualiza el pago si todavía figuraba pendiente.
        ...(dto.status === 'PAID' && sale.paymentStatus === 'PENDING' && { paymentStatus: 'PAID' as const }),
        ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
        statusHistory: { create: { status: dto.status, note: dto.note, changedById: user.id } },
      },
      include: detailInclude,
    });
    return toDetailDto(updated);
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<SaleDetail> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, select: { id: true } });
    if (!sale) throw new NotFoundException('La venta no existe.');
    const updated = await this.prisma.sale.update({ where: { id }, data: { paymentStatus }, include: detailInclude });
    return toDetailDto(updated);
  }
}
