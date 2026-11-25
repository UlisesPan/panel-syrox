"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categoryInputSchema, type Category, type CategoryInput } from "@panel/shared";
import { FieldGroup } from "@/components/ui/field";
import { NumberField, SelectField, TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import type { ResourceFormProps } from "@/components/crud/crud-page";
import { handleFormError } from "@/lib/form-errors";
import { useCategoryOptions } from "./categories.resource";

export function CategoryForm({ item, onSubmit, onCancel, isPending }: ResourceFormProps<Category, CategoryInput>) {
  const { data: categories = [] } = useCategoryOptions();
  const form = useForm({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: {
      name: item?.name ?? "",
      parentId: item?.parentId ?? null,
      position: item?.position ?? 0,
    },
  });

  // Una categoría no puede ser su propio padre (la API además valida ciclos más profundos).
  const parentOptions = categories
    .filter((c) => c.id !== item?.id && c.parentId !== item?.id)
    .map((c) => ({ value: c.id, label: c.name }));

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <TextField control={form.control} name="name" label="Nombre" placeholder="Ej: Running" required autoFocus />
        <SelectField
          control={form.control}
          name="parentId"
          label="Categoría padre"
          options={parentOptions}
          nullableLabel="Principal (sin padre)"
        />
        <NumberField
          control={form.control}
          name="position"
          label="Posición"
          min={0}
          step={1}
          description="Define el orden en que se muestra dentro de su nivel."
        />
        <FormActions submitLabel={item ? "Guardar cambios" : "Crear"} isPending={isPending} onCancel={onCancel} />
      </FieldGroup>
    </form>
  );
}
