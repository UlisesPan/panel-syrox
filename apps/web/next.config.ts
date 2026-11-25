import type { NextConfig } from "next";

/**
 * El front proxy-ea /api/* hacia la API de Nest. Así el navegador siempre habla
 * con el mismo origen: la cookie de sesión es first-party (sin CORS ni SameSite=None).
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@panel/shared"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
