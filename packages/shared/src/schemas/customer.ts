/**
 * Cliente derivado de las ventas: no es una tabla propia, se agrupa por email
 * (o por nombre cuando la venta no tiene email).
 */
export interface Customer {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Última dirección de envío usada. */
  address: string | null;
  ordersCount: number;
  /** Suma de las ventas cobradas (pago "Pagado"). */
  totalSpent: number;
  lastOrderAt: string;
}
