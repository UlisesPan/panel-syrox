import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Ingresá un correo válido').trim().toLowerCase(),
  password: z.string().min(1, 'Ingresá tu contraseña'),
  remember: z.boolean().default(false),
});

export type LoginInput = z.input<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres')
      .regex(/[A-Za-z]/, 'Incluí al menos una letra')
      .regex(/\d/, 'Incluí al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta a la actual',
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}
