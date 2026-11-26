import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  submitLabel: string;
  isPending?: boolean;
  /** Deshabilita el envío (ej: formulario sin cambios). */
  disabled?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function FormActions({ submitLabel, isPending, disabled, onCancel, className }: FormActionsProps) {
  return (
    <div className={cn("flex justify-end gap-2", className)}>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      )}
      <Button type="submit" disabled={isPending || disabled}>
        {isPending && <Spinner />}
        {submitLabel}
      </Button>
    </div>
  );
}
