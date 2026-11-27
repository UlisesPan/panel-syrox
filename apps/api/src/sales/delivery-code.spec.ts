import { describe, expect, it } from 'vitest';
import { deliveryCodeMatches, generateDeliveryCode, hashDeliveryCode } from './delivery-code.js';

describe('delivery code', () => {
  it('genera siempre 4 dígitos', () => {
    for (let i = 0; i < 200; i++) expect(generateDeliveryCode()).toMatch(/^\d{4}$/);
  });

  it('valida el código correcto y rechaza otro', () => {
    const hash = hashDeliveryCode('sale1', '0427');
    expect(deliveryCodeMatches('sale1', '0427', hash)).toBe(true);
    expect(deliveryCodeMatches('sale1', '0428', hash)).toBe(false);
  });

  it('el mismo código no sirve para otra venta', () => {
    expect(deliveryCodeMatches('sale2', '0427', hashDeliveryCode('sale1', '0427'))).toBe(false);
  });
});
