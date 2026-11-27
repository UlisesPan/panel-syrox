import type { PaymentMethod, PaymentStatus, ProductStatus, SaleStatus, UserRole } from "@panel/shared";

type BadgeVariant = "success" | "info" | "warning" | "violet" | "destructive" | "secondary" | "outline";

/** Textos y colores de los enums de la API, centralizados para toda la UI. */
export const saleStatusMeta: Record<SaleStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "Pendiente", variant: "warning" },
  PAID: { label: "Pagada", variant: "info" },
  PREPARING: { label: "En preparación", variant: "violet" },
  SHIPPED: { label: "Enviada", variant: "info" },
  DELIVERED: { label: "Entregada", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

export const productStatusMeta: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Activo", variant: "success" },
  DRAFT: { label: "Borrador", variant: "warning" },
  ARCHIVED: { label: "Archivado", variant: "secondary" },
};

export const paymentStatusMeta: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "Pendiente", variant: "warning" },
  PAID: { label: "Pagado", variant: "success" },
  FAILED: { label: "Fallido", variant: "destructive" },
  REFUNDED: { label: "Reembolsado", variant: "secondary" },
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  DEBIT_CARD: "Tarjeta de débito",
  CREDIT_CARD: "Tarjeta de crédito",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

export const userRoleMeta: Record<UserRole, { label: string; variant: BadgeVariant; description: string }> = {
  ADMIN: { label: "Administrador", variant: "violet", description: "Acceso completo al panel." },
  COURIER: {
    label: "Viajante",
    variant: "info",
    description: "Solo ve sus envíos y confirma las entregas con el código del cliente.",
  },
};

export const toOptions = <K extends string>(record: Record<K, string | { label: string }>) =>
  (Object.entries(record) as Array<[K, string | { label: string }]>).map(([value, meta]) => ({
    value,
    label: typeof meta === "string" ? meta : meta.label,
  }));
