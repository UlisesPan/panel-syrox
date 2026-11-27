import { z } from 'zod';

const emailSchema = z.email('Ingresá un correo válido').trim().toLowerCase();

/** Regla única de contraseñas nuevas (cambio, recuperación y alta de usuarios). */
export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Incluí al menos una letra')
  .regex(/\d/, 'Incluí al menos un número');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá tu contraseña'),
  remember: z.boolean().default(false),
});

export type LoginInput = z.input<typeof loginSchema>;

const confirmMatches = <T extends { newPassword: string; confirmPassword: string }>(v: T) =>
  v.newPassword === v.confirmPassword;
const confirmIssue = { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' };

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(confirmMatches, confirmIssue)
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta a la actual',
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'El enlace no es válido'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(confirmMatches, confirmIssue);

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/** La contraseña actual solo se exige (en la API) cuando cambia el email. */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá tu nombre').max(80),
  email: emailSchema,
  currentPassword: z.string().optional(),
});

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

/**
 * ADMIN: acceso completo al panel. COURIER ("viajante"): solo ve los envíos que tiene asignados
 * y confirma la entrega con el código que recibe el cliente por mail.
 */
export const USER_ROLES = ['ADMIN', 'COURIER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
