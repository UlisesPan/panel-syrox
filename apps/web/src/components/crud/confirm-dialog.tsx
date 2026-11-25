"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Si devuelve una promesa, el diálogo muestra loading y se cierra al resolverse. */
  onConfirm: () => unknown | Promise<unknown>;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  onConfirm,
  isPending,
}: ConfirmDialogProps) {
  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // El error ya se notificó (toast) desde la mutación; dejamos el diálogo abierto.
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => !isPending && onOpenChange(value)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            variant={destructive ? "destructive" : "default"}
          >
            {isPending && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
