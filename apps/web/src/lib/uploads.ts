"use client";

import { useQuery } from "@tanstack/react-query";
import { UPLOAD_ACCEPT, UPLOAD_MAX_MB, type UploadSignature, type UploadStatus } from "@panel/shared";
import { apiFetch } from "@/lib/api-client";

/** Si la API no tiene Cloudinary configurado, el panel ofrece solo la carga por URL. */
export function useUploadStatus() {
  return useQuery({
    queryKey: ["uploads", "status"],
    queryFn: () => apiFetch<UploadStatus>("/uploads/status"),
    staleTime: Infinity,
  });
}

/** Valida el archivo antes de subirlo (Cloudinary igual rechaza lo que no sea imagen). */
export function validateImage(file: File): string | null {
  if (!(UPLOAD_ACCEPT as readonly string[]).includes(file.type)) {
    return `"${file.name}" no es una imagen JPG, PNG, WebP o AVIF.`;
  }
  if (file.size > UPLOAD_MAX_MB * 1024 * 1024) return `"${file.name}" pesa más de ${UPLOAD_MAX_MB} MB.`;
  return null;
}

/**
 * Subida directa a Cloudinary: la API firma la operación y el archivo viaja del navegador a Cloudinary,
 * sin pasar por nuestro servidor. Devuelve la URL https pública de la imagen.
 */
export async function uploadImage(file: File): Promise<string> {
  const signature = await apiFetch<UploadSignature>("/uploads/signature", { method: "POST" });
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signature.apiKey);
  body.set("timestamp", String(signature.timestamp));
  body.set("signature", signature.signature);
  body.set("folder", signature.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const result = (await response.json().catch(() => null)) as { secure_url?: string; error?: { message: string } } | null;
  if (!response.ok || !result?.secure_url) {
    throw new Error(result?.error?.message ?? "No se pudo subir la imagen. Probá de nuevo.");
  }
  return result.secure_url;
}

/**
 * Para imágenes de Cloudinary pide una versión recortada al tamaño justo y en el mejor formato
 * que soporte el navegador (WebP/AVIF). Cualquier otra URL se devuelve sin cambios.
 */
export function optimizedImage(src: string, size: number) {
  const marker = "/image/upload/";
  if (!src.includes("res.cloudinary.com") || !src.includes(marker)) return src;
  return src.replace(marker, `${marker}f_auto,q_auto,c_fill,w_${size},h_${size}/`);
}
