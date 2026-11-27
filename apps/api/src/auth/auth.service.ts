import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import {
  changePasswordSchema,
  loginSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  type SessionUser,
} from '@panel/shared';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { passwordResetMail } from '../mail/mail-templates.js';
import { fieldError } from '../common/http/field-error.js';
import type { Env } from '../config/env.js';
import type { JwtPayload } from './auth.constants.js';

type LoginDto = z.output<typeof loginSchema>;
type ChangePasswordDto = z.output<typeof changePasswordSchema>;
type ResetPasswordDto = z.output<typeof resetPasswordSchema>;
type ProfileDto = z.output<typeof profileUpdateSchema>;

const RESET_TOKEN_TTL_MINUTES = 30;

// Cuando el usuario no existe igual se compara contra un hash real,
// así el tiempo de respuesta no revela qué emails están registrados.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-dummy-password', 10);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  async login({ email, password, remember }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    const session = await this.issueSession(user.id, user.tokenVersion, remember);
    return {
      ...session,
      user: { id: user.id, email: user.email, name: user.name, role: user.role } satisfies SessionUser,
    };
  }

  /** Firma el JWT de sesión. `remember` define la duración y si la cookie es persistente. */
  async issueSession(userId: string, tokenVersion: number, remember: boolean) {
    const payload: JwtPayload = { sub: userId, ver: tokenVersion, rem: remember };
    const expiresIn = this.config.get(remember ? 'JWT_REMEMBER_EXPIRES_IN' : 'JWT_EXPIRES_IN', { infer: true });
    const token = await this.jwt.signAsync(payload, { expiresIn: expiresIn as never });
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000), remember };
  }

  /** Cambia la contraseña y cierra las demás sesiones; devuelve una sesión nueva para el dispositivo actual. */
  async changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordDto, remember: boolean) {
    await this.assertPassword(userId, currentPassword);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await AuthService.hashPassword(newPassword), tokenVersion: { increment: 1 } },
    });
    return this.issueSession(user.id, user.tokenVersion, remember);
  }

  async updateProfile(userId: string, { name, email, currentPassword }: ProfileDto): Promise<SessionUser> {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (email !== current.email) {
      if (!currentPassword) {
        throw new BadRequestException(fieldError('currentPassword', 'Confirmá tu contraseña para cambiar el email.'));
      }
      await this.assertPassword(userId, currentPassword);
      await this.assertEmailAvailable(email, userId);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  /**
   * Siempre responde igual (exista o no el email) y el mail se envía en segundo plano,
   * así ni la respuesta ni su demora revelan qué cuentas existen.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
        },
      }),
    ]);

    const link = new URL('/restablecer-contrasena', this.config.get('APP_URL', { infer: true }));
    link.searchParams.set('token', token);
    this.mail
      .send({
        to: { email: user.email, name: user.name },
        ...passwordResetMail(this.mail.brand, {
          name: user.name,
          link: link.href,
          ttlMinutes: RESET_TOKEN_TTL_MINUTES,
        }),
      })
      .catch((error: unknown) => this.logger.error(`No se pudo enviar el mail de recuperación: ${String(error)}`));
  }

  async resetPassword({ token, newPassword }: ResetPasswordDto): Promise<void> {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('El enlace es inválido o ya venció. Pedí uno nuevo.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await AuthService.hashPassword(newPassword), tokenVersion: { increment: 1 } },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId } }),
    ]);
  }

  async assertEmailAvailable(email: string, excludeUserId?: string) {
    const taken = await this.prisma.user.count({
      where: { email, id: excludeUserId ? { not: excludeUserId } : undefined },
    });
    if (taken) throw new ConflictException(fieldError('email', 'Ya existe un usuario con ese email.'));
  }

  private async assertPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException(fieldError('currentPassword', 'La contraseña actual no es correcta.'));
    }
  }

  static hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}
