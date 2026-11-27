import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  canTransitionSale,
  DELIVERY_CODE_MAX_ATTEMPTS,
  deliveryConfirmSchema,
  paymentStatusAfter,
  saleFiltersSchema,
  saleInputSchema,
  saleStatusUpdateSchema,
  variantLabel,
  type ListQuery,
  type Paginated,
  type PaymentStatus,
  type Delivery,
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
import { fieldError } from '../common/http/field-error.js';
import { MailService } from '../mail/mail.service.js';
import { orderShippedMail } from '../mail/mail-templates.js';
import { deliveryCodeMatches, generateDeliveryCode, hashDeliveryCode } from './delivery-code.js';

type SaleDto = z.output<typeof saleInputSchema>;
type SaleStatusDto = z.output<typeof saleStatusUpdateSchema>;
type SaleListQuery = ListQuery & z.output<typeof saleFiltersSchema>;
type DeliveryConfirmDto = z.output<typeof deliveryConfirmSchema>;

/** Estados finales: una venta entregada o cancelada ya no cambia. */
const FINAL_STATUSES: SaleStatus[] = ['DELIVERED', 'CANCELLED'];

const STATUS_LABELS: Record<SaleStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const listInclude = {
  _count: { select: { items: true } },
  courier: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;
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
  courier: s.courier,
  createdAt: s.createdAt.toISOString(),
});

const toDetailDto = (s: SaleDetailRow): SaleDetail => ({
  ...toSaleDto(s),
  createdBy: s.createdBy,
  hasDeliveryCode: s.deliveryCodeHash !== null,
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
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async findAll(query: SaleListQuery): Promise<Paginated<Sale>> {
    const search = query.search?.replace(/^#/, '');
    const saleNumber = search && /^\d+$/.test(search) ? Number(search) : undefined;
    const where: Prisma.SaleWhereInput = {
      status: query.status,
      paymentStatus: query.paymentStatus,
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
          status: dto.paid ? 'PAID' : 'PENDING',
          paymentStatus: dto.paid ? 'PAID' : 'PENDING',
          notes: dto.notes,
          total,
          createdById: user.id,
          items: { create: items },
          statusHistory: {
            create: {
              status: dto.paid ? 'PAID' : 'PENDING',
              note: dto.paid ? 'Registrada como pagada' : null,
              changedById: user.id,
            },
          },
        },
        include: detailInclude,
      });
    });
    return toDetailDto(sale);
  }

  /**
   * Avanza la venta según `SALE_TRANSITIONS` (un paso por vez; cancelar solo antes del envío).
   * El pago se actualiza solo: "Pagada" lo cobra y cancelar una venta cobrada la reembolsa.
   * El `where` incluye el estado leído para que dos cambios simultáneos no se pisen.
   */
  async updateStatus(id: string, dto: SaleStatusDto, user: SessionUser): Promise<SaleDetail> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      select: { status: true, paymentStatus: true, customerEmail: true, courierId: true },
    });
    if (!sale) throw new NotFoundException('La venta no existe.');
    if (FINAL_STATUSES.includes(sale.status)) {
      throw new BadRequestException('La venta ya está finalizada y no puede cambiar de estado.');
    }
    if (!canTransitionSale(sale.status, dto.status)) {
      throw new BadRequestException(
        dto.status === 'CANCELLED'
          ? 'Una venta enviada ya no se puede cancelar.'
          : `No se puede pasar de "${STATUS_LABELS[sale.status]}" a "${STATUS_LABELS[dto.status]}".`,
      );
    }
    const shipping = dto.status === 'SHIPPED';
    const courier = shipping && dto.courierId ? await this.findCourier(dto.courierId) : null;
    // Con viajante y email del cliente se genera el código de entrega (sin email no hay cómo hacérselo llegar).
    const code = courier && sale.customerEmail ? generateDeliveryCode() : null;

    const paymentStatus = paymentStatusAfter(dto.status, sale.paymentStatus);
    const autoNotes = [
      paymentStatus === 'REFUNDED' && sale.paymentStatus === 'PAID' && 'Pago reembolsado',
      courier && `Viajante: ${courier.name}`,
      dto.status === 'DELIVERED' && sale.courierId && 'Entrega confirmada por administración',
    ];
    const note = [dto.note, ...autoNotes].filter(Boolean).join(' · ') || null;

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.sale.updateMany({
        where: { id, status: sale.status },
        data: {
          status: dto.status,
          paymentStatus,
          ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
          ...(shipping && {
            courierId: courier?.id ?? null,
            deliveryCodeHash: code ? hashDeliveryCode(id, code) : null,
            deliveryCodeAttempts: 0,
          }),
          // Al entregar o cancelar, el código deja de tener sentido.
          ...(!shipping && { deliveryCodeHash: null }),
        },
      });
      if (count === 0) throw new ConflictException('La venta cambió mientras la editabas. Recargá e intentá de nuevo.');
      await tx.saleStatusChange.create({ data: { saleId: id, status: dto.status, note, changedById: user.id } });
    });

    const updated = await this.findOne(id);
    if (shipping) this.sendShippedMail(updated, code);
    return updated;
  }

  /** Genera un código nuevo (invalida el anterior y reinicia los intentos) y se lo vuelve a mandar al cliente. */
  async resendDeliveryCode(id: string): Promise<SaleDetail> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      select: { status: true, courierId: true, customerEmail: true },
    });
    if (!sale) throw new NotFoundException('La venta no existe.');
    if (sale.status !== 'SHIPPED' || !sale.courierId) {
      throw new BadRequestException('Solo se reenvía el código de una venta enviada con viajante.');
    }
    if (!sale.customerEmail) throw new BadRequestException('La venta no tiene email del cliente.');

    const code = generateDeliveryCode();
    await this.prisma.sale.update({
      where: { id },
      data: { deliveryCodeHash: hashDeliveryCode(id, code), deliveryCodeAttempts: 0 },
    });
    const updated = await this.findOne(id);
    this.sendShippedMail(updated, code);
    return updated;
  }

  /** "Mis entregas": envíos asignados al viajante (pendientes o los últimos entregados). */
  async findDeliveries(courierId: string, status: 'SHIPPED' | 'DELIVERED'): Promise<Delivery[]> {
    const sales = await this.prisma.sale.findMany({
      where: { courierId, status },
      orderBy: { updatedAt: status === 'SHIPPED' ? 'asc' : 'desc' },
      take: 50,
      include: {
        items: { select: { id: true, productName: true, variantLabel: true, quantity: true } },
        statusHistory: {
          where: { status: { in: ['SHIPPED', 'DELIVERED'] } },
          select: { status: true, createdAt: true },
        },
      },
    });
    return sales.map((s) => {
      const at = (step: SaleStatus) => s.statusHistory.find((h) => h.status === step)?.createdAt.toISOString() ?? null;
      return {
        id: s.id,
        number: s.number,
        status: s.status,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        shippingAddress: s.shippingAddress,
        trackingNumber: s.trackingNumber,
        notes: s.notes,
        total: toMoney(s.total),
        items: s.items,
        requiresCode: s.deliveryCodeHash !== null,
        attemptsLeft: Math.max(0, DELIVERY_CODE_MAX_ATTEMPTS - s.deliveryCodeAttempts),
        shippedAt: at('SHIPPED'),
        deliveredAt: at('DELIVERED'),
      };
    });
  }

  /**
   * El viajante confirma la entrega. Si el cliente recibió un código, hay que ingresarlo:
   * cada intento fallido se cuenta y al llegar al máximo el código se bloquea hasta que administración lo reenvíe.
   */
  async confirmDelivery(id: string, dto: DeliveryConfirmDto, courier: SessionUser): Promise<void> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      select: { status: true, courierId: true, deliveryCodeHash: true, deliveryCodeAttempts: true },
    });
    if (!sale || sale.courierId !== courier.id)
      throw new NotFoundException('El envío no existe o no está asignado a vos.');
    if (sale.status !== 'SHIPPED') throw new BadRequestException('Este envío ya no está pendiente de entrega.');

    if (sale.deliveryCodeHash) {
      if (sale.deliveryCodeAttempts >= DELIVERY_CODE_MAX_ATTEMPTS) {
        throw new BadRequestException(
          fieldError('code', 'Se agotaron los intentos. Pedile a administración que le reenvíe el código al cliente.'),
        );
      }
      if (!dto.code) throw new BadRequestException(fieldError('code', 'Ingresá el código que recibió el cliente.'));
      if (!deliveryCodeMatches(id, dto.code, sale.deliveryCodeHash)) {
        const { deliveryCodeAttempts } = await this.prisma.sale.update({
          where: { id },
          data: { deliveryCodeAttempts: { increment: 1 } },
          select: { deliveryCodeAttempts: true },
        });
        const left = DELIVERY_CODE_MAX_ATTEMPTS - deliveryCodeAttempts;
        throw new BadRequestException(
          fieldError(
            'code',
            left > 0
              ? `Código incorrecto. ${left === 1 ? 'Te queda 1 intento' : `Te quedan ${left} intentos`}.`
              : 'Código incorrecto. Se agotaron los intentos: pedile a administración que reenvíe el código.',
          ),
        );
      }
    }

    const note = [
      sale.deliveryCodeHash ? 'Entrega confirmada con código' : 'Entrega confirmada por el viajante',
      dto.receivedBy && `Recibió: ${dto.receivedBy}`,
    ]
      .filter(Boolean)
      .join(' · ');
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.sale.updateMany({
        where: { id, status: 'SHIPPED', courierId: courier.id },
        data: { status: 'DELIVERED', deliveryCodeHash: null },
      });
      if (count === 0) throw new ConflictException('El envío cambió mientras lo confirmabas. Recargá la lista.');
      await tx.saleStatusChange.create({ data: { saleId: id, status: 'DELIVERED', note, changedById: courier.id } });
    });
  }

  private async findCourier(courierId: string) {
    const courier = await this.prisma.user.findUnique({
      where: { id: courierId },
      select: { id: true, name: true, role: true },
    });
    if (!courier || courier.role !== 'COURIER') {
      throw new BadRequestException(fieldError('courierId', 'Elegí un viajante válido.'));
    }
    return courier;
  }

  /** Avisa al cliente que el pedido salió (con el código si lo lleva un viajante). No bloquea la respuesta. */
  private sendShippedMail(sale: SaleDetail, code: string | null) {
    if (!sale.customerEmail) return;
    const mail = orderShippedMail(this.mail.brand, {
      customerName: sale.customerName,
      number: sale.number,
      items: sale.items.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        subtotal: this.mail.formatMoney(i.subtotal),
      })),
      total: this.mail.formatMoney(sale.total),
      shippingAddress: sale.shippingAddress,
      trackingNumber: sale.trackingNumber,
      courierName: sale.courier?.name ?? null,
      code,
    });
    this.mail
      .send({ to: { email: sale.customerEmail, name: sale.customerName }, ...mail })
      .catch((error: unknown) =>
        this.logger.error(`No se pudo enviar el aviso de envío de #${sale.number}: ${String(error)}`),
      );
  }

  /** Solo mientras la venta está pendiente se puede registrar un pago fallido (o volverlo a pendiente). */
  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<SaleDetail> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, select: { status: true } });
    if (!sale) throw new NotFoundException('La venta no existe.');
    if (sale.status !== 'PENDING') {
      throw new BadRequestException('El pago solo se puede modificar mientras la venta está pendiente.');
    }
    const updated = await this.prisma.sale.update({ where: { id }, data: { paymentStatus }, include: detailInclude });
    return toDetailDto(updated);
  }
}
