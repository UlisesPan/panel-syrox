/**
 * Configuración white-label: todo lo que cambia entre una tienda y otra vive acá
 * y se controla por variables de entorno. El resto del panel es 100% genérico.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Mi Tienda",
  logo: process.env.NEXT_PUBLIC_STORE_LOGO || null,
  brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || "#e11d48",
  currency: process.env.NEXT_PUBLIC_CURRENCY || "MXN",
  locale: process.env.NEXT_PUBLIC_LOCALE || "es-MX",
} as const;
