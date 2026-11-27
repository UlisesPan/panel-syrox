import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar.
 * Si falta algo, la app no levanta y el error dice exactamente qué variable corregir.
 */
const emptyAsUndefined = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.url(),
    /** Conexiones máximas del pool (bajarlo en Postgres serverless / planes con pocas conexiones). */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    JWT_REMEMBER_EXPIRES_IN: z.string().default('30d'),
    /**
     * URL pública del panel (links de los mails). Si no se define se usa el primer origen de CORS_ORIGINS,
     * que en producción ya apunta al front: así un deploy sin APP_URL nunca manda links a localhost.
     */
    APP_URL: emptyAsUndefined(z.url().optional()),
    /** Brevo (API HTTP; el plan free de Render bloquea SMTP). Sin API key, los mails se escriben en el log. */
    BREVO_API_KEY: emptyAsUndefined(z.string().optional()),
    MAIL_FROM_EMAIL: emptyAsUndefined(z.email().optional()),
    MAIL_FROM_NAME: z.string().default('Panel Admin'),
    /** Color de los botones y encabezado de los mails (mismo que NEXT_PUBLIC_BRAND_COLOR). */
    MAIL_BRAND_COLOR: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Usá un color hex, ej: #e11d48')
      .default('#e11d48'),
    /** Logo de los mails. Por defecto APP_URL + /brand/logo.png. */
    MAIL_LOGO_URL: emptyAsUndefined(z.url().optional()),
    /** Moneda y locale de los importes en los mails (mismos que el panel). */
    CURRENCY: z.string().length(3).default('MXN'),
    LOCALE: z.string().default('es-MX'),
    /** Cloudinary (subida de imágenes de productos). Sin estas variables se cargan por URL. */
    CLOUDINARY_CLOUD_NAME: emptyAsUndefined(z.string().optional()),
    CLOUDINARY_API_KEY: emptyAsUndefined(z.string().optional()),
    CLOUDINARY_API_SECRET: emptyAsUndefined(z.string().optional()),
  })
  .transform((env) => ({
    ...env,
    APP_URL: (env.APP_URL ?? env.CORS_ORIGINS.split(',')[0]!.trim()).replace(/\/+$/, ''),
  }));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas:\n${details}`);
  }
  return result.data;
}
