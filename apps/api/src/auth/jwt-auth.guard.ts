import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { SessionUser } from '@panel/shared';
import { IS_PUBLIC_KEY, SESSION_COOKIE, type JwtPayload } from './auth.constants.js';

/**
 * Guard global: toda ruta requiere sesión salvo las marcadas con @Public().
 * Acepta el JWT desde la cookie httpOnly (panel web) o el header Bearer (Swagger / clientes externos).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Sesión no iniciada.');

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = { id: payload.sub, email: payload.email, name: payload.name };
      return true;
    } catch {
      throw new UnauthorizedException('La sesión expiró o es inválida.');
    }
  }

  private extractToken(request: Request): string | undefined {
    const fromCookie = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (fromCookie) return fromCookie;
    const [type, value] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? value : undefined;
  }
}
