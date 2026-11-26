"use client";

import { useState, type ReactNode } from "react";
import { PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { SearchInput } from "@/components/data-table/search-input";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useListParams } from "@/hooks/use-list-params";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import type { Resource } from "@/lib/resource";
import { ConfirmDialog } from "./confirm-dialog";
import { FormDialog } from "./form-dialog";
import { PageHeader } from "./page-header";
import { RowActions } from "./row-actions";

export interface ResourceFormProps<TItem, TInput> {
  /** null = creación, item = edición. */
  item: TItem | null;
  onSubmit: (input: TInput) => Promise<unknown>;
  onCancel: () => void;
  isPending: boolean;
}

interface CrudPageProps<TItem extends { id: string }, TInput, TDetail> {
  resource: Resource<TItem, TInput, TDetail>;
  description?: string;
  columns: DataTableColumn<TItem>[];
  searchPlaceholder?: string;
  defaultSort?: { sortBy: string; sortOrder: "asc" | "desc" };
  getItemLabel: (item: TItem) => string;
  /** Formulario del recurso. CrudPage se encarga de abrirlo, guardar y cerrar. */
  renderForm: (props: ResourceFormProps<TItem, TInput>) => ReactNode;
  deleteDescription?: (item: TItem) => ReactNode;
  /** Oculta la acción de eliminar en las filas que devuelvan false. */
  canDelete?: (item: TItem) => boolean;
  viewHref?: (item: TItem) => string;
  viewTooltip?: string;
}

type DialogState<T> = { mode: "create" } | { mode: "edit"; item: T } | null;

/**
 * Página CRUD completa a partir de un recurso: listado con búsqueda, orden y paginación
 * (en la URL), alta y edición en modal, y borrado con confirmación.
 * Categorías y Marcas son instancias de este mismo componente.
 */
export function CrudPage<TItem extends { id: string }, TInput, TDetail>({
  resource,
  description,
  columns,
  searchPlaceholder = "Buscar por nombre…",
  defaultSort,
  getItemLabel,
  renderForm,
  deleteDescription,
  canDelete,
  viewHref,
  viewTooltip,
}: CrudPageProps<TItem, TInput, TDetail>) {
  const { state, queryParams, setParams, toggleSort } = useListParams(defaultSort);
  const list = useResourceList(resource, queryParams);
  const { create, update, remove, messages } = useResourceMutations(resource);

  const [dialog, setDialog] = useState<DialogState<TItem>>(null);
  const [toDelete, setToDelete] = useState<TItem | null>(null);

  const editingItem = dialog?.mode === "edit" ? dialog.item : null;
  const closeDialog = () => setDialog(null);

  const handleSubmit = async (input: TInput) => {
    if (editingItem) await update.mutateAsync({ id: editingItem.id, input });
    else await create.mutateAsync(input);
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={resource.labels.plural}
        description={description}
        actions={
          <Button onClick={() => setDialog({ mode: "create" })}>
            <PlusIcon />
            {messages.newLabel}
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <SearchInput
            value={state.search}
            onChange={(search) => setParams({ search })}
            placeholder={searchPlaceholder}
            className="sm:max-w-xs"
          />
          <DataTable
            columns={columns}
            data={list.data?.data}
            meta={list.data?.meta}
            getRowId={(row) => row.id}
            isLoading={list.isPending}
            isFetching={list.isFetching}
            sort={state}
            onSortChange={toggleSort}
            onPageChange={(page) => setParams({ page })}
            onPageSizeChange={(pageSize) => setParams({ pageSize })}
            rowActions={(item) => (
              <RowActions
                label={getItemLabel(item)}
                viewHref={viewHref?.(item)}
                viewTooltip={viewTooltip}
                onEdit={() => setDialog({ mode: "edit", item })}
                onDelete={canDelete && !canDelete(item) ? undefined : () => setToDelete(item)}
              />
            )}
            emptyState={
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {state.search ? "Sin resultados" : `Todavía no hay ${resource.labels.plural.toLowerCase()}`}
                  </EmptyTitle>
                  <EmptyDescription>
                    {state.search
                      ? `No encontramos coincidencias para “${state.search}”.`
                      : `Creá la primera con el botón “${messages.newLabel}”.`}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            }
          />
        </CardContent>
      </Card>

      <FormDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && closeDialog()}
        title={editingItem ? messages.editLabel : messages.newLabel}
      >
        {renderForm({
          item: editingItem,
          onSubmit: handleSubmit,
          onCancel: closeDialog,
          isPending: create.isPending || update.isPending,
        })}
      </FormDialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`¿Eliminar “${toDelete ? getItemLabel(toDelete) : ""}”?`}
        description={
          (toDelete && deleteDescription?.(toDelete)) ?? "Esta acción no se puede deshacer."
        }
        confirmLabel="Eliminar"
        destructive
        isPending={remove.isPending}
        onConfirm={() => toDelete && remove.mutateAsync(toDelete.id)}
      />
    </div>
  );
}
