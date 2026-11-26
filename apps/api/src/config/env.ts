import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar.
 * Si falta algo, la app no levanta y el error dice exactamente qué variable corregir.
 */
const emptyAsUndefined = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  /** Conexiones máximas del pool (bajarlo en Postgres serverless / planes con pocas conexiones). */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REMEMBER_EXPIRES_IN: z.string().default('30d'),
  /** URL pública del panel: se usa para armar el link de recuperación de contraseña. */
  APP_URL: z.url().default('http://localhost:3000'),
  /** Brevo (API HTTP; el plan free de Render bloquea SMTP). Sin API key, los mails se escriben en el log. */
  BREVO_API_KEY: emptyAsUndefined(z.string().optional()),
  MAIL_FROM_EMAIL: emptyAsUndefined(z.email().optional()),
  MAIL_FROM_NAME: z.string().default('Panel Admin'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas:\n${details}`);
  }
  return result.data;
}
