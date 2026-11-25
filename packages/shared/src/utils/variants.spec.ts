import { describe, expect, it } from 'vitest';
import { buildVariantCombinations, suggestVariantSku, variantKey } from './variants.js';
import { slugify } from './slug.js';
import { productInputSchema } from '../schemas/product.js';

describe('buildVariantCombinations', () => {
  it('genera el producto cartesiano de las opciones', () => {
    const combos = buildVariantCombinations([
      { name: 'Color', values: ['Rojo', 'Azul'] },
      { name: 'Talla', values: ['40', '41', '42'] },
    ]);
    expect(combos).toHaveLength(6);
    expect(combos[0]).toEqual({ Color: 'Rojo', Talla: '40' });
  });

  it('ignora opciones sin valores', () => {
    expect(buildVariantCombinations([{ name: 'Color', values: [] }])).toEqual([]);
  });
});

describe('variantKey', () => {
  it('no depende del orden de las claves ni de mayúsculas', () => {
    expect(variantKey({ Talla: '40', Color: 'Rojo' })).toBe(variantKey({ color: 'rojo', talla: '40' }));
  });
});

describe('suggestVariantSku', () => {
  it('normaliza acentos y caracteres especiales', () => {
    expect(suggestVariantSku('zap-01', { Color: 'Marrón', Talla: '42' })).toBe('ZAP-01-MARR-42');
  });
});

describe('slugify', () => {
  it('genera slugs url-safe', () => {
    expect(slugify('  Zapatillas Niño 2024! ')).toBe('zapatillas-nino-2024');
  });
});

describe('productInputSchema', () => {
  const base = { name: 'Zapatilla', price: 100, brandId: 'brand-1' };

  it('exige una marca', () => {
    const result = productInputSchema.safeParse({ name: 'Zapatilla', price: 100 });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain('brandId');
  });

  it('acepta variantes que corresponden a las opciones', () => {
    const result = productInputSchema.safeParse({
      ...base,
      options: [{ name: 'Talla', values: ['40', '41'] }],
      variants: [
        { sku: 'Z-40', options: { Talla: '40' } },
        { sku: 'Z-41', options: { Talla: '41' } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza variantes inexistentes y SKUs repetidos', () => {
    const result = productInputSchema.safeParse({
      ...base,
      options: [{ name: 'Talla', values: ['40'] }],
      variants: [
        { sku: 'Z-1', options: { Talla: '40' } },
        { sku: 'z-1', options: { Talla: '99' } },
      ],
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) => i.message);
    expect(messages).toContain('Combinación de opciones inválida');
    expect(messages).toContain('SKU repetido');
  });
});
