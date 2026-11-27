import { createHash } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UploadSignature, UploadStatus } from '@panel/shared';
import type { Env } from '../config/env.js';

const FOLDER = 'panel/products';

/**
 * Firma subidas a Cloudinary. El navegador sube el archivo directo a Cloudinary con esta firma:
 * la API nunca recibe el archivo (Render free es lento y tiene poca memoria) y el secreto nunca sale del servidor.
 * La firma vence sola (Cloudinary rechaza timestamps de más de 1 h) y fija la carpeta de destino.
 */
@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  status(): UploadStatus {
    return { enabled: this.credentials() !== null };
  }

  sign(): UploadSignature {
    const credentials = this.credentials();
    if (!credentials) {
      throw new ServiceUnavailableException('La subida de imágenes no está configurada. Cargá la imagen por URL.');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    return {
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      timestamp,
      folder: FOLDER,
      signature: signParams({ folder: FOLDER, timestamp }, credentials.apiSecret),
    };
  }

  private credentials() {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });
    return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
  }
}

/** Algoritmo de Cloudinary: parámetros ordenados `a=1&b=2` + secreto, en SHA-1. */
export function signParams(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(payload + secret)
    .digest('hex');
}
