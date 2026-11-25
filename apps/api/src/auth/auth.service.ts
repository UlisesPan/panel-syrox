import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { changePasswordSchema, loginSchema, type SessionUser } from '@panel/shared';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Env } from '../config/env.js';
import type { JwtPayload } from './auth.constants.js';

type LoginDto = z.output<typeof loginSchema>;
type ChangePasswordDto = z.output<typeof changePasswordSchema>;

// Cuando el usuario no existe igual se compara contra un hash real,
// así el tiempo de respuesta no revela qué emails están registrados.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-dummy-password', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login({ email, password, remember }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name };
    const expiresIn = this.config.get(remember ? 'JWT_REMEMBER_EXPIRES_IN' : 'JWT_EXPIRES_IN', { infer: true });
    const token = await this.jwt.signAsync(payload, { expiresIn: expiresIn as never });
    const { exp } = this.jwt.decode<{ exp: number }>(token);

    const sessionUser: SessionUser = { id: user.id, email: user.email, name: user.name };
    return { token, expiresAt: new Date(exp * 1000), user: sessionUser };
  }

  async changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException({
        message: 'La contraseña actual no es correcta.',
        errors: [{ path: 'currentPassword', message: 'La contraseña actual no es correcta.' }],
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await AuthService.hashPassword(newPassword) },
    });
  }

  static hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}
