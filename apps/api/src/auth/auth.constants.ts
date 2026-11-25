import { SetMetadata } from '@nestjs/common';

export const SESSION_COOKIE = 'panel_session';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca una ruta como accesible sin sesión (el guard de auth es global). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}
