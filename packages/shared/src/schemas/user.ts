import { z } from 'zod';
import { passwordSchema, USER_ROLES, type UserRole } from './auth.js';

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá el nombre').max(80),
  email: z.email('Ingresá un correo válido').trim().toLowerCase(),
  role: z.enum(USER_ROLES).default('ADMIN'),
});

export const userCreateSchema = userUpdateSchema.extend({ password: passwordSchema });

/** Filtros del listado de usuarios (se suman al listQuerySchema). */
export const userFiltersSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;

/** Usuario del panel (administrador o viajante). */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Ventas registradas (admin). */
  salesCount: number;
  /** Envíos asignados que todavía no se entregaron (viajante). */
  pendingDeliveries: number;
  createdAt: string;
}
