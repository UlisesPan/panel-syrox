/* eslint-disable @next/next/no-img-element -- el logo puede ser una URL externa configurable */
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

/**
 * Logo white-label: isotipo configurado por env (o monograma con el color de marca) + nombre de la tienda.
 * Con el sidebar colapsado solo queda el isotipo (el nombre es el último span).
 */
export function StoreLogo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {siteConfig.logo ? (
        <img
          src={siteConfig.logo}
          alt=""
          className="size-8 shrink-0 rounded-full object-contain shadow-sm ring-1 ring-black/5"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-white shadow-sm"
        >
          {initials(siteConfig.name)}
        </span>
      )}
      {showName && <span className="truncate font-semibold tracking-tight">{siteConfig.name}</span>}
    </span>
  );
}
