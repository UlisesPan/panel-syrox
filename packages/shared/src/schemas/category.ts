import { z } from 'zod';
import type { EntityRef } from './common.js';

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(60, 'El nombre no puede superar los 60 caracteres'),
  parentId: z.string().min(1).nullable().default(null),
  position: z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativa').default(0),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export type CategoryInput = z.input<typeof categoryInputSchema>;
export type CategoryUpdateInput = z.input<typeof categoryUpdateSchema>;

export interface Category {
  id: string;
  name: string;
  slug: string;
  position: number;
  parentId: string | null;
  parent: EntityRef | null;
  childrenCount: number;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}
