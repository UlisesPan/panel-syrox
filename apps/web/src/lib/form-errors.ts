import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError, getErrorMessage } from "./api-client";

/**
 * Lleva los errores de la API al formulario: los errores por campo se muestran
 * debajo del input correspondiente y el resto como toast.
 */
export function handleFormError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (error instanceof ApiError && error.fieldErrors.length > 0) {
    for (const fieldError of error.fieldErrors) {
      setError((fieldError.path || "root") as Path<T>, { type: "server", message: fieldError.message });
    }
    return;
  }
  toast.error(getErrorMessage(error));
}
