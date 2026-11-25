import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Ingresá un correo válido').trim().toLowerCase(),
  password: z.string().min(1, 'Ingresá tu contraseña'),
  remember: z.boolean().default(false),
});

export type LoginInput = z.input<typeof loginSchema>;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}
