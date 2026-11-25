import { slugify } from '@panel/shared';

/**
 * Genera un slug único: "running", "running-2", "running-3"...
 * `exists` recibe el candidato y debe indicar si ya está tomado (excluyendo el propio registro al editar).
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || 'item';
  let candidate = root;
  for (let i = 2; await exists(candidate); i++) {
    candidate = `${root}-${i}`;
  }
  return candidate;
}
