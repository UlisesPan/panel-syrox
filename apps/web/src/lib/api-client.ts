import type { ApiErrorBody } from "@panel/shared";

/** Error tipado de la API: conserva el status y los errores por campo. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: NonNullable<ApiErrorBody["errors"]>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.statusCode;
    this.fieldErrors = body.errors ?? [];
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

function buildQuery(params?: Record<string, QueryValue>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Cliente HTTP único del panel. Todas las llamadas pasan por /api (rewrite de Next),
 * así la cookie httpOnly de sesión viaja sola y nunca se expone a JavaScript.
 */
export async function apiFetch<T>(path: string, { method = "GET", body, params, signal }: RequestOptions = {}) {
  let response: Response;
  try {
    response = await fetch(`/api${path}${buildQuery(params)}`, {
      method,
      signal,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError({ statusCode: 0, message: "No se pudo conectar con el servidor." });
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new ApiError(
      data?.message ? data : { statusCode: response.status, message: "Ocurrió un error inesperado." },
    );
    // Sesión vencida: volvemos al login conservando a dónde quería ir el usuario.
    if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/login")) {
      // Se borra la cookie inválida; si no, el proxy vería "sesión" y devolvería al panel (loop).
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Recarga completa a propósito: descarta todo el estado/cache en memoria de la sesión vencida.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}`);
    }
    throw error;
  }
  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Ocurrió un error inesperado.";
}
