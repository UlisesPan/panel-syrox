import { z } from 'zod';

export const SALE_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

/**
 * Medio de pago registrado de forma informativa.
 * La consigna excluye explícitamente una pasarela de pagos: acá solo se guarda el dato.
 */
export const PAYMENT_METHODS = ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Máquina de estados de la venta: solo se avanza un paso por vez y se cancela
 * antes del envío. API y panel usan esta misma tabla.
 */
export const SALE_TRANSITIONS: Record<SaleStatus, readonly SaleStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const canTransitionSale = (from: SaleStatus, to: SaleStatus) => SALE_TRANSITIONS[from].includes(to);

/**
 * El pago acompaña al estado de la venta: "Marcar como pagada" lo pasa a PAID y cancelar
 * una venta cobrada lo pasa a REFUNDED. A mano solo se registra un pago fallido mientras la venta está pendiente.
 */
export const MANUAL_PAYMENT_STATUSES = ['PENDING', 'FAILED'] as const;
export type ManualPaymentStatus = (typeof MANUAL_PAYMENT_STATUSES)[number];

export function paymentStatusAfter(to: SaleStatus, current: PaymentStatus): PaymentStatus {
  if (to === 'PAID') return 'PAID';
  if (to === 'CANCELLED') return current === 'PAID' ? 'REFUNDED' : current;
  return current;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .default(null)
    .transform((v) => v || null);

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, 'Seleccioná un producto'),
  variantId: z.string().min(1).nullable().default(null),
  quantity: z.coerce.number().int('Cantidad inválida').min(1, 'Mínimo 1').max(999, 'Máximo 999'),
});

export const saleInputSchema = z.object({
  customerName: z.string().trim().min(2, 'Ingresá el nombre del cliente').max(120),
  customerEmail: z.email('Correo inválido').nullable().default(null),
  customerPhone: optionalText(30),
  shippingAddress: optionalText(300),
  paymentMethod: z.enum(PAYMENT_METHODS).default('CASH'),
  /** true = se registra ya cobrada (estado "Pagada"). */
  paid: z.boolean().default(false),
  notes: optionalText(500),
  items: z
    .array(saleItemInputSchema)
    .min(1, 'Agregá al menos un producto')
    .max(50, 'Máximo 50 ítems por venta'),
});

export const saleStatusUpdateSchema = z.object({
  status: z.enum(SALE_STATUSES),
  note: optionalText(500),
  /** Solo se guarda si viene informado (ej: al marcar la venta como enviada). */
  trackingNumber: optionalText(100),
  /**
   * Viajante que entrega el pedido (solo al pasar a "Enviada"). Si se asigna y la venta tiene email,
   * el cliente recibe un código de entrega que el viajante ingresa para confirmarla.
   */
  courierId: z.string().min(1).nullable().default(null),
});

/** Cantidad de intentos fallidos permitidos antes de bloquear el código de entrega. */
export const DELIVERY_CODE_MAX_ATTEMPTS = 5;

export const deliveryConfirmSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'El código tiene 4 números')
    .nullable()
    .default(null),
  /** Quién recibió el pedido (opcional). */
  receivedBy: optionalText(120),
});

export type DeliveryConfirmInput = z.input<typeof deliveryConfirmSchema>;

export const salePaymentUpdateSchema = z.object({
  paymentStatus: z.enum(MANUAL_PAYMENT_STATUSES),
});

/** Filtros adicionales del listado de ventas (se suman al listQuerySchema). */
export const saleFiltersSchema = z.object({
  status: z.enum(SALE_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

export type SaleInput = z.input<typeof saleInputSchema>;
export type SaleItemInput = z.input<typeof saleItemInputSchema>;
export type SaleStatusUpdateInput = z.input<typeof saleStatusUpdateSchema>;

export interface SaleItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  number: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  trackingNumber: string | null;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes: string | null;
  total: number;
  itemsCount: number;
  /** Viajante asignado al envío. */
  courier: { id: string; name: string } | null;
  createdAt: string;
}

/** Producto vendible tal como lo necesita el formulario de "Generar venta". */
export interface SaleProductOption {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  image: string | null;
  variants: Array<{ id: string; sku: string; label: string; price: number }>;
}

export interface SaleStatusChange {
  id: string;
  status: SaleStatus;
  note: string | null;
  changedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface SaleDetail extends Sale {
  items: SaleItem[];
  /** Hay un código de entrega vigente (se mandó por mail al cliente). */
  hasDeliveryCode: boolean;
  createdBy: { id: string; name: string } | null;
  /** Más reciente primero. */
  statusHistory: SaleStatusChange[];
}

/** Envío asignado a un viajante, tal como lo ve en "Mis entregas". */
export interface Delivery {
  id: string;
  number: number;
  status: SaleStatus;
  customerName: string;
  customerPhone: string | null;
  shippingAddress: string | null;
  trackingNumber: string | null;
  notes: string | null;
  total: number;
  items: Array<{ id: string; productName: string; variantLabel: string | null; quantity: number }>;
  /** Si es true, para confirmar hay que ingresar el código que recibió el cliente. */
  requiresCode: boolean;
  /** Intentos restantes con el código actual. */
  attemptsLeft: number;
  shippedAt: string | null;
  deliveredAt: string | null;
}
