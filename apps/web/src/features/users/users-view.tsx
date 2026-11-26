"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userCreateSchema, userUpdateSchema, type User, type UserCreateInput } from "@panel/shared";
import { CrudPage, type ResourceFormProps } from "@/components/crud/crud-page";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import { useSessionUser } from "@/features/auth/use-session";
import { defineResource } from "@/lib/resource";
import { formatDate, initials } from "@/lib/format";
import { handleFormError } from "@/lib/form-errors";

const usersResource = defineResource<User, UserCreateInput>({
  key: "users",
  endpoint: "/users",
  labels: { singular: "Usuario", plural: "Usuarios", gender: "m" },
});

function columns(currentUserId?: string): DataTableColumn<User>[] {
  return [
    {
      id: "name",
      header: "Usuario",
      sortKey: "name",
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
          >
            {initials(u.name)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              {u.name}
              {u.id === currentUserId && <Badge variant="secondary">Vos</Badge>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "sales",
      header: "Ventas registradas",
      cell: (u) => <span className="tabular-nums">{u.salesCount}</span>,
    },
    {
      id: "createdAt",
      header: "Alta",
      sortKey: "createdAt",
      cell: (u) => <span className="text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
  ];
}

/** Alta: nombre, email y contraseña inicial. Edición: solo nombre y email (la contraseña la cambia cada usuario). */
function UserForm({ item, onSubmit, onCancel, isPending }: ResourceFormProps<User, UserCreateInput>) {
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(item ? userUpdateSchema : userCreateSchema) as never,
    defaultValues: { name: item?.name ?? "", email: item?.email ?? "", password: "" },
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
        <TextField control={form.control} name="name" label="Nombre" required autoFocus />
        <TextField control={form.control} name="email" type="email" label="Email" required />
        {!item && (
          <TextField
            control={form.control}
            name="password"
            type="password"
            label="Contraseña inicial"
            description="Mínimo 8 caracteres, con una letra y un número. Puede cambiarla desde Configuración."
            autoComplete="new-password"
            required
          />
        )}
        <FormActions submitLabel={item ? "Guardar cambios" : "Crear usuario"} isPending={isPending} onCancel={onCancel} />
      </FieldGroup>
    </form>
  );
}

export function UsersView() {
  const { data: me } = useSessionUser();
  return (
    <CrudPage
      resource={usersResource}
      description="Administradores con acceso al panel."
      columns={columns(me?.id)}
      searchPlaceholder="Buscar por nombre o email…"
      defaultSort={{ sortBy: "createdAt", sortOrder: "asc" }}
      getItemLabel={(u) => u.name}
      renderForm={(props) => <UserForm {...props} />}
      canDelete={(u) => u.id !== me?.id}
      deleteDescription={() =>
        "Pierde el acceso al panel de inmediato. Las ventas que registró se conservan. Esta acción no se puede deshacer."
      }
    />
  );
}
