"use client";

import Link from "next/link";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RowActionsProps {
  label: string;
  onView?: () => void;
  viewHref?: string;
  viewTooltip?: string;
  onEdit?: () => void;
  editHref?: string;
  onDelete?: () => void;
}

/** Acciones de fila (ver / editar / eliminar) con tooltips y labels accesibles. */
export function RowActions({
  label,
  onView,
  viewHref,
  viewTooltip = "Ver detalle",
  onEdit,
  editHref,
  onDelete,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {(onView || viewHref) && (
        <ActionButton tooltip={viewTooltip} ariaLabel={`${viewTooltip}: ${label}`} onClick={onView} href={viewHref}>
          <EyeIcon />
        </ActionButton>
      )}
      {(onEdit || editHref) && (
        <ActionButton tooltip="Editar" ariaLabel={`Editar ${label}`} onClick={onEdit} href={editHref}>
          <PencilIcon />
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton tooltip="Eliminar" ariaLabel={`Eliminar ${label}`} onClick={onDelete} destructive>
          <Trash2Icon />
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  tooltip,
  ariaLabel,
  onClick,
  href,
  destructive,
  children,
}: {
  tooltip: string;
  ariaLabel: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button variant="ghost" size="icon-sm" className={className} aria-label={ariaLabel} asChild>
            <Link href={href}>{children}</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" className={className} aria-label={ariaLabel} onClick={onClick}>
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
