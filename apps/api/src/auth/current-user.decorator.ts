import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from '@panel/shared';

/** Inyecta el usuario autenticado (lo agrega `JwtAuthGuard` al request). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest().user;
});
