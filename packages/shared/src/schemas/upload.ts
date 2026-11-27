/**
 * Subida de imágenes a Cloudinary: la API solo firma la subida (el secreto nunca sale del servidor)
 * y el navegador manda el archivo directo a Cloudinary, sin pasar por nuestra API.
 */
export const UPLOAD_MAX_MB = 5;
export const UPLOAD_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export interface UploadStatus {
  enabled: boolean;
}
