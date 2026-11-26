import { describe, expect, it } from 'vitest';
import { canTransitionSale, paymentStatusAfter, saleInputSchema } from './sale.js';

describe('canTransitionSale', () => {
  it('solo avanza un paso por vez', () => {
    expect(canTransitionSale('PENDING', 'PAID')).toBe(true);
    expect(canTransitionSale('PAID', 'PREPARING')).toBe(true);
    expect(canTransitionSale('SHIPPED', 'DELIVERED')).toBe(true);
    expect(canTransitionSale('PENDING', 'DELIVERED')).toBe(false);
    expect(canTransitionSale('PENDING', 'SHIPPED')).toBe(false);
    expect(canTransitionSale('PREPARING', 'PAID')).toBe(false);
  });

  it('permite cancelar hasta antes del envío', () => {
    expect(canTransitionSale('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransitionSale('PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransitionSale('SHIPPED', 'CANCELLED')).toBe(false);
  });

  it('los estados finales no cambian', () => {
    expect(canTransitionSale('DELIVERED', 'CANCELLED')).toBe(false);
    expect(canTransitionSale('CANCELLED', 'PENDING')).toBe(false);
  });
});

describe('paymentStatusAfter', () => {
  it('marcar como pagada cobra la venta aunque el pago haya fallado antes', () => {
    expect(paymentStatusAfter('PAID', 'PENDING')).toBe('PAID');
    expect(paymentStatusAfter('PAID', 'FAILED')).toBe('PAID');
  });

  it('cancelar una venta cobrada la reembolsa; si no estaba cobrada, no cambia', () => {
    expect(paymentStatusAfter('CANCELLED', 'PAID')).toBe('REFUNDED');
    expect(paymentStatusAfter('CANCELLED', 'FAILED')).toBe('FAILED');
    expect(paymentStatusAfter('CANCELLED', 'PENDING')).toBe('PENDING');
  });

  it('el resto de los pasos no toca el pago', () => {
    expect(paymentStatusAfter('SHIPPED', 'PAID')).toBe('PAID');
  });
});

describe('saleInputSchema', () => {
  it('convierte textos vacíos opcionales en null y no está pagada por defecto', () => {
    const sale = saleInputSchema.parse({
      customerName: 'Ana',
      customerPhone: '  ',
      items: [{ productId: 'p1', quantity: 1 }],
    });
    expect(sale.customerPhone).toBeNull();
    expect(sale.paid).toBe(false);
  });
});
