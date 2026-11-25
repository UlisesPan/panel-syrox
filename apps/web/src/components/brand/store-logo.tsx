/* eslint-disable @next/next/no-img-element -- el logo puede ser una URL externa configurable */
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

/** Logo white-label: imagen configurada por env o, si no hay, monograma con el color de marca. */
export function StoreLogo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {siteConfig.logo ? (
        <img src={siteConfig.logo} alt={siteConfig.name} className="h-8 w-auto max-w-40 object-contain" />
      ) : (
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-white shadow-sm"
        >
          {initials(siteConfig.name)}
        </span>
      )}
      {showName && !siteConfig.logo && (
        <span className="truncate font-semibold tracking-tight">{siteConfig.name}</span>
      )}
    </span>
  );
}
