import { z } from 'zod';
import type { EntityRef } from './common.js';
import { buildVariantCombinations, variantKey } from '../utils/variants.js';

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const moneySchema = z.coerce
  .number({ error: 'Ingresá un precio válido' })
  .positive('El precio debe ser mayor a 0')
  .max(99_999_999, 'Precio demasiado alto')
  .transform((n) => Math.round(n * 100) / 100);

export const productOptionSchema = z.object({
  name: z.string().trim().min(1, 'Nombre de la opción requerido').max(30),
  values: z
    .array(z.string().trim().min(1).max(30))
    .min(1, 'Agregá al menos un valor')
    .max(20)
    .refine((v) => new Set(v.map((x) => x.toLowerCase())).size === v.length, 'Hay valores repetidos'),
});

export const productVariantSchema = z.object({
  sku: z.string().trim().min(1, 'SKU requerido').max(64),
  price: moneySchema.nullable().default(null),
  options: z.record(z.string(), z.string()),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
    description: z.string().trim().max(2000).nullable().default(null),
    price: moneySchema,
    sku: z.string().trim().max(64).nullable().default(null),
    status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
    categoryId: z.string().min(1).nullable().default(null),
    brandId: z.string({ error: 'Seleccioná una marca' }).min(1, 'Seleccioná una marca'),
    images: z.array(z.url('URL de imagen inválida')).max(8, 'Máximo 8 imágenes').default([]),
    options: z
      .array(productOptionSchema)
      .max(3, 'Máximo 3 opciones')
      .refine(
        (o) => new Set(o.map((x) => x.name.toLowerCase())).size === o.length,
        'Hay opciones con el mismo nombre',
      )
      .default([]),
    variants: z.array(productVariantSchema).max(200).default([]),
  })
  .superRefine((product, ctx) => {
    // Las variantes deben corresponder exactamente a combinaciones válidas de las opciones.
    if (product.options.length === 0) {
      if (product.variants.length > 0) {
        ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Definí opciones antes de crear variantes' });
      }
      return;
    }
    const valid = new Set(buildVariantCombinations(product.options).map(variantKey));
    const seenKeys = new Set<string>();
    const seenSkus = new Set<string>();
    product.variants.forEach((variant, index) => {
      const key = variantKey(variant.options);
      if (!valid.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index], message: 'Combinación de opciones inválida' });
      }
      if (seenKeys.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index], message: 'Variante duplicada' });
      }
      if (seenSkus.has(variant.sku.toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['variants', index, 'sku'], message: 'SKU repetido' });
      }
      seenKeys.add(key);
      seenSkus.add(variant.sku.toLowerCase());
    });
  });

/** Filtros adicionales del listado de productos (se suman al listQuerySchema). */
export const productFiltersSchema = z.object({
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
});

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductOptionInput = z.input<typeof productOptionSchema>;
export type ProductVariantInput = z.input<typeof productVariantSchema>;

export interface ProductVariant {
  id: string;
  sku: string;
  price: number | null;
  options: Record<string, string>;
}

export interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sku: string | null;
  status: ProductStatus;
  images: string[];
  category: EntityRef | null;
  brand: EntityRef;
  variantsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  options: ProductOption[];
  variants: ProductVariant[];
}
