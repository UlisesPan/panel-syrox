export interface OptionLike {
  name: string;
  values: string[];
}

/**
 * Producto cartesiano de las opciones de un producto.
 * Ej: [{Color: [Rojo, Azul]}, {Talla: [40, 41]}] → 4 combinaciones.
 * Se usa en el front para previsualizar variantes y en la API para validarlas.
 */
export function buildVariantCombinations(options: OptionLike[]): Array<Record<string, string>> {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<Array<Record<string, string>>>(
    (acc, option) => acc.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
    [{}],
  );
}

/** Clave estable para comparar combinaciones sin importar el orden de las claves. */
export function variantKey(options: Record<string, string>): string {
  return Object.keys(options)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k.toLowerCase()}=${(options[k] ?? '').toLowerCase()}`)
    .join('|');
}

/** Etiqueta legible: "Rojo / 42". */
export function variantLabel(options: Record<string, string>): string {
  return Object.values(options).join(' / ');
}

/** Sugerencia de SKU a partir del SKU base y los valores de la variante. */
export function suggestVariantSku(baseSku: string, options: Record<string, string>): string {
  const suffix = Object.values(options)
    .map((v) =>
      v
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4),
    )
    .join('-');
  return [baseSku.trim().toUpperCase() || 'SKU', suffix].filter(Boolean).join('-');
}
