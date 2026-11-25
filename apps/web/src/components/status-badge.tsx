import type { PaymentStatus, ProductStatus, SaleStatus } from "@panel/shared";
import { Badge } from "@/components/ui/badge";
import { paymentStatusMeta, productStatusMeta, saleStatusMeta } from "@/lib/labels";

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const meta = saleStatusMeta[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = paymentStatusMeta[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = productStatusMeta[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
