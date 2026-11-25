import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "panel_session";
const PUBLIC_PATHS = ["/login"];

/**
 * Chequeo optimista de sesión: si no hay cookie, redirige al login antes de renderizar.
 * La validación real del JWT la hace la API en cada request (si expiró, devuelve 401
 * y el cliente HTTP redirige al login).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo excepto la API (proxy hacia Nest), assets de Next y archivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
