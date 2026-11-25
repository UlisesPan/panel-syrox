import { siteConfig } from "@/config/site";

const currencyFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
});

const compactCurrencyFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(siteConfig.locale, { dateStyle: "medium", timeStyle: "short" });
const numberFormatter = new Intl.NumberFormat(siteConfig.locale);

export const formatCurrency = (value: number) => currencyFormatter.format(value);
export const formatCompactCurrency = (value: number) => compactCurrencyFormatter.format(value);
export const formatDate = (value: string | Date) => dateFormatter.format(new Date(value));
export const formatDateTime = (value: string | Date) => dateTimeFormatter.format(new Date(value));
export const formatNumber = (value: number) => numberFormatter.format(value);

/** "Hace 5 min", "Hace 2 h", "Hace 3 días" */
export function formatRelative(value: string | Date) {
  const rtf = new Intl.RelativeTimeFormat(siteConfig.locale, { numeric: "auto" });
  const diffSeconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(0, "minute");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
