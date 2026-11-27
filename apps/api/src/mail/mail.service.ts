import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { MailBrand } from './mail-templates.js';

interface MailMessage {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

/**
 * Envío de mails transaccionales con la API HTTP de Brevo.
 * Sin BREVO_API_KEY (desarrollo) el mail se escribe en el log en vez de enviarse.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly money: Intl.NumberFormat;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.money = new Intl.NumberFormat(config.get('LOCALE', { infer: true }), {
      style: 'currency',
      currency: config.get('CURRENCY', { infer: true }),
    });
  }

  /** Identidad de la tienda para las plantillas (nombre, color, logo y URL del panel). */
  get brand(): MailBrand {
    const appUrl = this.config.get('APP_URL', { infer: true });
    return {
      name: this.config.get('MAIL_FROM_NAME', { infer: true }),
      color: this.config.get('MAIL_BRAND_COLOR', { infer: true }),
      logoUrl: this.config.get('MAIL_LOGO_URL', { infer: true }) ?? new URL('/brand/logo.png', appUrl).href,
      appUrl,
    };
  }

  formatMoney(value: number | { toString(): string }) {
    return this.money.format(Number(value));
  }

  async send(message: MailMessage): Promise<void> {
    const apiKey = this.config.get('BREVO_API_KEY', { infer: true });
    const fromEmail = this.config.get('MAIL_FROM_EMAIL', { infer: true });
    if (!apiKey || !fromEmail) {
      this.logger.warn(
        `Mail no enviado (falta BREVO_API_KEY o MAIL_FROM_EMAIL) → ${message.to.email}\n${message.text}`,
      );
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: fromEmail, name: this.config.get('MAIL_FROM_NAME', { infer: true }) },
        to: [message.to],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Brevo respondió ${response.status}: ${await response.text()}`);
    }
  }
}
