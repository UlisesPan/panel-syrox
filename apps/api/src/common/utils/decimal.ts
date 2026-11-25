import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Prisma devuelve los montos como Decimal (precisión exacta en DB).
 * En la respuesta HTTP los exponemos como number con 2 decimales.
 */
export function toMoney(value: Prisma.Decimal): number;
export function toMoney(value: Prisma.Decimal | null): number | null;
export function toMoney(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value.toFixed(2));
}
