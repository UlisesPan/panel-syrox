import { z } from 'zod';
import { passwordSchema } from './auth.js';

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá el nombre').max(80),
  email: z.email('Ingresá un correo válido').trim().toLowerCase(),
});

export const userCreateSchema = userUpdateSchema.extend({ password: passwordSchema });

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;

/** Usuario administrador del panel. */
export interface User {
  id: string;
  name: string;
  email: string;
  salesCount: number;
  createdAt: string;
}
