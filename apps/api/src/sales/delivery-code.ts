import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Código de entrega de 4 dígitos (como el de Mercado Libre): lo recibe el cliente por mail y el viajante
 * lo ingresa al entregar. En la base solo se guarda su hash, atado a la venta (el mismo código en otra
 * venta da otro hash). Con 4 dígitos la protección real es el límite de intentos.
 */
export const generateDeliveryCode = () => String(randomInt(0, 10_000)).padStart(4, '0');

export const hashDeliveryCode = (saleId: string, code: string) =>
  createHash('sha256').update(`${saleId}:${code}`).digest('hex');

export function deliveryCodeMatches(saleId: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashDeliveryCode(saleId, code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
