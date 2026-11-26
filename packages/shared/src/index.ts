import { z } from 'zod';

// Mensajes de validación por defecto en español (front y back usan este mismo paquete).
z.config(z.locales.es());

export * from './schemas/common.js';
export * from './schemas/auth.js';
export * from './schemas/category.js';
export * from './schemas/brand.js';
export * from './schemas/product.js';
export * from './schemas/sale.js';
export * from './schemas/customer.js';
export * from './schemas/user.js';
export * from './schemas/dashboard.js';
export * from './utils/variants.js';
export * from './utils/slug.js';
