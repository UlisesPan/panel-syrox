"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandInputSchema, type Brand, type BrandInput } from "@panel/shared";
import { CrudPage, type ResourceFormProps } from "@/components/crud/crud-page";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import { FieldGroup } from "@/components/ui/field";
import { formatDate } from "@/lib/format";
import { handleFormError } from "@/lib/form-errors";
import { brandsResource } from "./brands.resource";

/**
 * Ejemplo de lo que cuesta sumar un CRUD nuevo con la arquitectura del panel:
 * un recurso (brands.resource.ts) + columnas + formulario. Todo lo demás es reutilizado.
 */
const columns: DataTableColumn<Brand>[] = [
  { id: "name", header: "Nombre", sortKey: "name", cell: (b) => <span className="font-medium">{b.name}</span> },
  {
    id: "products",
    header: "Productos",
    sortKey: "productsCount",
    cell: (b) => <span className="tabular-nums">{b.productsCount}</span>,
  },
  {
    id: "createdAt",
    header: "Creada",
    sortKey: "createdAt",
    cell: (b) => <span className="text-muted-foreground">{formatDate(b.createdAt)}</span>,
  },
];

function BrandForm({ item, onSubmit, onCancel, isPending }: ResourceFormProps<Brand, BrandInput>) {
  const form = useForm({
    resolver: zodResolver(brandInputSchema),
    defaultValues: { name: item?.name ?? "" },
  });
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
        <TextField control={form.control} name="name" label="Nombre" placeholder="Ej: Adidas" required autoFocus />
        <FormActions submitLabel={item ? "Guardar cambios" : "Crear"} isPending={isPending} onCancel={onCancel} />
      </FieldGroup>
    </form>
  );
}

export function BrandsView() {
  return (
    <CrudPage
      resource={brandsResource}
      description="Marcas disponibles para asignar a los productos."
      columns={columns}
      defaultSort={{ sortBy: "name", sortOrder: "asc" }}
      getItemLabel={(b) => b.name}
      renderForm={(props) => <BrandForm {...props} />}
      viewHref={(b) => `/productos?brandId=${b.id}`}
      viewTooltip="Ver productos"
      deleteDescription={(b) =>
        b.productsCount > 0
          ? `También se eliminarán sus ${b.productsCount} producto(s). Las ventas ya registradas no se modifican. Esta acción no se puede deshacer.`
          : "Esta acción no se puede deshacer."
      }
    />
  );
}
