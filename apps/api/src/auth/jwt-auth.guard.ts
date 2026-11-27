import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { SessionUser, UserRole } from '@panel/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { IS_PUBLIC_KEY, ROLES_KEY, SESSION_COOKIE, type JwtPayload } from './auth.constants.js';

export type AuthenticatedRequest = Request & { user?: SessionUser; session?: JwtPayload };

/**
 * Guard global: toda ruta requiere sesión salvo las marcadas con @Public().
 * Acepta el JWT desde la cookie httpOnly (panel web) o el header Bearer (Swagger / clientes externos).
 * El usuario se lee de la base en cada request: si fue eliminado o cambió su contraseña
 * (tokenVersion distinto), el token deja de valer aunque no haya expirado. También se valida el rol
 * (@Roles; por defecto solo ADMIN), así un cambio de rol aplica en el próximo request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Sesión no iniciada.');

    const payload = await this.jwt.verifyAsync<JwtPayload>(token).catch(() => null);
    const user = payload
      ? await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, role: true, tokenVersion: true },
        })
      : null;
    if (!payload || !user || user.tokenVersion !== (payload.ver ?? 0)) {
      throw new UnauthorizedException('La sesión expiró o es inválida.');
    }

    const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['ADMIN'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('No tenés permiso para realizar esta acción.');
    }

    request.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    request.session = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const fromCookie = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (fromCookie) return fromCookie;
    const [type, value] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? value : undefined;
  }
}
