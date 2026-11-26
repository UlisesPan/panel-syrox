import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "panel_session";
/** Accesibles sin sesión. */
const PUBLIC_PATHS = ["/login", "/recuperar-contrasena", "/restablecer-contrasena"];
/** Si ya hay sesión no tiene sentido mostrarlas: se redirige al inicio. */
const GUEST_ONLY_PATHS = ["/login"];

const matches = (paths: string[], pathname: string) => paths.some((path) => pathname.startsWith(path));

/**
 * Chequeo optimista de sesión: si no hay cookie, redirige al login antes de renderizar.
 * La validación real del JWT la hace la API en cada request (si expiró, devuelve 401
 * y el cliente HTTP redirige al login).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !matches(PUBLIC_PATHS, pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && matches(GUEST_ONLY_PATHS, pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo excepto la API (proxy hacia Nest), assets de Next y archivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
