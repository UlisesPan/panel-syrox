/* eslint-disable @next/next/no-img-element -- imágenes de URLs arbitrarias cargadas por el usuario */
"use client";

import { useState } from "react";
import { ImageOffIcon, PackageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { optimizedImage } from "@/lib/uploads";

/** Miniatura de producto con placeholder si no hay imagen o si la URL falla. */
export function ProductThumb({
  src,
  alt,
  className,
  size = 80,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  /** Tamaño a pedir a Cloudinary (px, ya contempla pantallas retina). */
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-muted-foreground",
        className,
      )}
    >
      {src && !failed ? (
        <img src={optimizedImage(src, size)} alt={alt} className="size-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : failed ? (
        <ImageOffIcon className="size-4" />
      ) : (
        <PackageIcon className="size-4" />
      )}
    </span>
  );
}
