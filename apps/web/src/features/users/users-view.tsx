"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWatch } from "react-hook-form";
import { userCreateSchema, userUpdateSchema, type User, type UserCreateInput } from "@panel/shared";
import { CrudPage, type ResourceFormProps } from "@/components/crud/crud-page";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { SelectField, TextField } from "@/components/form/form-field";
import { FormActions } from "@/components/form/form-actions";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import { useSessionUser } from "@/features/auth/use-session";
import { defineResource } from "@/lib/resource";
import { formatDate, initials } from "@/lib/format";
import { handleFormError } from "@/lib/form-errors";
import { toOptions, userRoleMeta } from "@/lib/labels";

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
      id: "role",
      header: "Rol",
      sortKey: "role",
      cell: (u) => <Badge variant={userRoleMeta[u.role].variant}>{userRoleMeta[u.role].label}</Badge>,
    },
    {
      id: "activity",
      header: "Actividad",
      cell: (u) => (
        <span className="text-muted-foreground tabular-nums">
          {u.role === "COURIER"
            ? `${u.pendingDeliveries} ${u.pendingDeliveries === 1 ? "envío" : "envíos"} en curso`
            : `${u.salesCount} ${u.salesCount === 1 ? "venta registrada" : "ventas registradas"}`}
        </span>
      ),
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
function UserForm({ item, onSubmit, onCancel, isPending, isSelf }: ResourceFormProps<User, UserCreateInput> & { isSelf: boolean }) {
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(item ? userUpdateSchema : userCreateSchema) as never,
    defaultValues: { name: item?.name ?? "", email: item?.email ?? "", role: item?.role ?? "ADMIN", password: "" },
  });
  const role = useWatch({ control: form.control, name: "role" }) ?? "ADMIN";
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
        <SelectField
          control={form.control}
          name="role"
          label="Rol"
          options={toOptions(userRoleMeta)}
          disabled={isSelf}
          description={isSelf ? "No podés cambiar tu propio rol." : userRoleMeta[role].description}
          required
        />
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
      description="Administradores y viajantes con acceso al panel."
      columns={columns(me?.id)}
      searchPlaceholder="Buscar por nombre o email…"
      defaultSort={{ sortBy: "createdAt", sortOrder: "asc" }}
      getItemLabel={(u) => u.name}
      renderForm={(props) => <UserForm {...props} isSelf={props.item?.id === me?.id} />}
      canDelete={(u) => u.id !== me?.id}
      deleteDescription={() =>
        "Pierde el acceso al panel de inmediato. Sus ventas se conservan y sus envíos en curso quedan sin viajante. Esta acción no se puede deshacer."
      }
    />
  );
}
