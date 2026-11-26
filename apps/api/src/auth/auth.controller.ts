import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  type SessionUser,
} from '@panel/shared';
import type { z } from 'zod';
import type { Env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { Public, SESSION_COOKIE } from './auth.constants.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

const STRICT_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y setea la cookie httpOnly de sesión' })
  async login(
    @Body({ schema: loginSchema }) dto: z.output<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, ...session } = await this.auth.login(dto);
    this.setSessionCookie(res, session);
    return { user };
  }

  /** Público a propósito: tiene que poder borrar una cookie vencida o invalidada. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra la sesión' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @ApiOperation({ summary: 'Usuario de la sesión actual' })
  me(@CurrentUser() user: SessionUser) {
    return { user };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualiza nombre y email (cambiar el email pide la contraseña actual)' })
  async updateProfile(
    @Body({ schema: profileUpdateSchema }) dto: z.output<typeof profileUpdateSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return { user: await this.auth.updateProfile(user.id, dto) };
  }

  @Throttle(STRICT_LIMIT)
  @Patch('password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cambia la contraseña y cierra las sesiones de otros dispositivos' })
  async changePassword(
    @Body({ schema: changePasswordSchema }) dto: z.output<typeof changePasswordSchema>,
    @CurrentUser() user: SessionUser,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.changePassword(user.id, dto, req.session?.rem ?? false);
    this.setSessionCookie(res, session);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Envía un mail con el enlace para restablecer la contraseña (no revela si el email existe)' })
  forgotPassword(@Body({ schema: forgotPasswordSchema }) dto: z.output<typeof forgotPasswordSchema>) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Define una contraseña nueva con el token recibido por mail' })
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) dto: z.output<typeof resetPasswordSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.resetPassword(dto);
    // Todas las sesiones quedaron invalidadas: si este navegador tenía una, se borra la cookie.
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  /** Sin "Mantener sesión iniciada" la cookie es de sesión: se borra al cerrar el navegador. */
  private setSessionCookie(res: Response, session: { token: string; expiresAt: Date; remember: boolean }) {
    res.cookie(SESSION_COOKIE, session.token, {
      ...this.cookieOptions(),
      ...(session.remember && { expires: session.expiresAt }),
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/',
    };
  }
}
