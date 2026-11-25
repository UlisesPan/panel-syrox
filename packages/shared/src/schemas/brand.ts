import { z } from 'zod';

export const brandInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(60, 'El nombre no puede superar los 60 caracteres'),
});

export const brandUpdateSchema = brandInputSchema.partial();

export type BrandInput = z.input<typeof brandInputSchema>;

export interface Brand {
  id: string;
  name: string;
  slug: string;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}
