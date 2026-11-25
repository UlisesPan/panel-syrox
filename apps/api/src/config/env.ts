import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar.
 * Si falta algo, la app no levanta y el error dice exactamente qué variable corregir.
 */
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
