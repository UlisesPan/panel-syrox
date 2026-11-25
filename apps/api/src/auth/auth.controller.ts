import { Body, Controller, Get, HttpCode, Patch, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { changePasswordSchema, loginSchema, type SessionUser } from '@panel/shared';
import type { z } from 'zod';
import type { Env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { Public, SESSION_COOKIE } from './auth.constants.js';
import { CurrentUser } from './current-user.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y setea la cookie httpOnly de sesión' })
  async login(
    @Body({ schema: loginSchema }) dto: z.output<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, expiresAt, user } = await this.auth.login(dto);
    // Sin "Mantener sesión iniciada" la cookie es de sesión: se borra al cerrar el navegador.
    res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), ...(dto.remember && { expires: expiresAt }) });
    return { user };
  }

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

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch('password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cambia la contraseña del usuario de la sesión' })
  changePassword(
    @Body({ schema: changePasswordSchema }) dto: z.output<typeof changePasswordSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.auth.changePassword(user.id, dto);
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
