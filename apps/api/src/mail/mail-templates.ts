/**
 * Plantillas HTML de los mails transaccionales.
 * Se arman con tablas y estilos inline porque es lo único que respetan todos los clientes de correo
 * (Gmail, Outlook, Apple Mail). Todo texto que viene de la base pasa por `escapeHtml`.
 */

export interface MailBrand {
  /** Nombre de la tienda (remitente). */
  name: string;
  /** Color principal en hex. */
  color: string;
  /** URL absoluta del logo (o null para mostrar solo el nombre). */
  logoUrl: string | null;
  appUrl: string;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const MUTED = '#71717a';
const TEXT = '#18181b';
const BORDER = '#e4e4e7';

const paragraph = (html: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${TEXT}">${html}</p>`;

const button = (brand: MailBrand, href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
  <tr><td style="border-radius:10px;background:${brand.color}">
    <a href="${escapeHtml(href)}" target="_blank"
       style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">
      ${escapeHtml(label)}
    </a>
  </td></tr>
</table>`;

const note = (html: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0">
  <tr><td style="background:#f4f4f5;border-radius:10px;padding:14px 16px;font-size:13px;line-height:20px;color:${MUTED}">
    ${html}
  </td></tr>
</table>`;

/** Estructura común: encabezado con el color y logo de la tienda, contenido y pie. */
function layout(brand: MailBrand, { preheader, title, body }: { preheader: string; title: string; body: string }) {
  const name = escapeHtml(brand.name);
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" width="56" height="56" alt="${name}"
            style="display:block;margin:0 auto 12px;border-radius:50%;background:#ffffff;border:3px solid rgba(255,255,255,.85)">`
    : '';
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER}">
        <tr><td align="center" style="background:${brand.color};padding:28px 24px">
          ${logo}
          <div style="font-size:18px;font-weight:700;letter-spacing:.3px;color:#ffffff">${name}</div>
        </td></tr>
        <tr><td style="padding:36px 36px 28px">
          <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;color:${TEXT}">${escapeHtml(title)}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid ${BORDER};font-size:12px;line-height:18px;color:${MUTED}" align="center">
          Enviado por ${name} · Este es un mail automático, no hace falta responderlo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function passwordResetMail(
  brand: MailBrand,
  { name, link, ttlMinutes }: { name: string; link: string; ttlMinutes: number },
): RenderedMail {
  const title = 'Restablecé tu contraseña';
  return {
    subject: `${title} · ${brand.name}`,
    html: layout(brand, {
      preheader: `El enlace vence en ${ttlMinutes} minutos.`,
      title,
      body: [
        paragraph(`Hola <strong>${escapeHtml(name)}</strong>,`),
        paragraph(
          'Recibimos un pedido para cambiar la contraseña de tu cuenta del panel. Tocá el botón para elegir una nueva:',
        ),
        button(brand, link, 'Elegir nueva contraseña'),
        paragraph(
          `<span style="font-size:13px;color:${MUTED}">¿El botón no funciona? Copiá este enlace en el navegador:<br>
           <a href="${escapeHtml(link)}" style="color:${brand.color};word-break:break-all">${escapeHtml(link)}</a></span>`,
        ),
        note(
          `🔒 El enlace vence en <strong>${ttlMinutes} minutos</strong> y sirve una sola vez. Si no lo pediste, ignorá este mail: tu contraseña no cambia.`,
        ),
      ].join(''),
    }),
    text: `Hola ${name}:\n\nPara elegir una contraseña nueva entrá a este enlace (vence en ${ttlMinutes} minutos):\n${link}\n\nSi no lo pediste, ignorá este mail.`,
  };
}

interface ShippedMailData {
  customerName: string;
  number: number;
  items: Array<{ productName: string; variantLabel: string | null; quantity: number; subtotal: string }>;
  total: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  /** Código de entrega (solo si hay viajante asignado). */
  code: string | null;
}

/** "Tu pedido está en camino": resumen del pedido y, si lo lleva un viajante, el código de entrega. */
export function orderShippedMail(brand: MailBrand, data: ShippedMailData): RenderedMail {
  const title = `¡Tu pedido #${data.number} está en camino!`;
  const rows = data.items
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT}">
          ${escapeHtml(item.productName)}${item.variantLabel ? `<br><span style="font-size:12px;color:${MUTED}">${escapeHtml(item.variantLabel)}</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED}" align="center">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT}" align="right">${escapeHtml(item.subtotal)}</td>
      </tr>`,
    )
    .join('');

  const codeBlock = data.code
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px">
  <tr><td align="center" style="border:2px dashed ${brand.color};border-radius:14px;padding:22px 16px">
    <div style="font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED}">Código de entrega</div>
    <div style="margin-top:8px;font-family:'SFMono-Regular',Consolas,monospace;font-size:40px;font-weight:700;letter-spacing:14px;padding-left:14px;color:${TEXT}">${escapeHtml(data.code)}</div>
    <div style="margin-top:10px;font-size:13px;line-height:20px;color:${MUTED}">
      Dáselo a ${data.courierName ? `<strong>${escapeHtml(data.courierName)}</strong>` : 'quien te entregue el pedido'} cuando lo recibas.<br>No lo compartas antes de tener el paquete en la mano.
    </div>
  </td></tr>
</table>`
    : '';

  const details = [
    data.shippingAddress && `<strong>Dirección:</strong> ${escapeHtml(data.shippingAddress)}`,
    data.trackingNumber && `<strong>Nº de seguimiento:</strong> ${escapeHtml(data.trackingNumber)}`,
  ].filter(Boolean);

  return {
    subject: data.code
      ? `Tu pedido #${data.number} está en camino · código de entrega ${data.code}`
      : `Tu pedido #${data.number} está en camino`,
    html: layout(brand, {
      preheader: data.code ? `Tu código de entrega es ${data.code}.` : 'Ya despachamos tu pedido.',
      title,
      body: [
        paragraph(`Hola <strong>${escapeHtml(data.customerName)}</strong>, ya despachamos tu pedido.`),
        codeBlock,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
          ${rows}
          <tr>
            <td colspan="2" style="padding:12px 0 0;font-size:15px;font-weight:700;color:${TEXT}">Total</td>
            <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:${TEXT}" align="right">${escapeHtml(data.total)}</td>
          </tr>
        </table>`,
        details.length ? note(details.join('<br>')) : '',
      ].join(''),
    }),
    text: [
      `Hola ${data.customerName}, tu pedido #${data.number} está en camino.`,
      data.code &&
        `\nCódigo de entrega: ${data.code}\nDáselo a ${data.courierName ?? 'quien te entregue el pedido'} cuando recibas el paquete.`,
      '',
      ...data.items.map(
        (i) => `- ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}: ${i.subtotal}`,
      ),
      `Total: ${data.total}`,
      data.shippingAddress && `Dirección: ${data.shippingAddress}`,
      data.trackingNumber && `Nº de seguimiento: ${data.trackingNumber}`,
    ]
      .filter((line) => line !== null && line !== undefined)
      .join('\n'),
  };
}
