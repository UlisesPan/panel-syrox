"use client";

import type { Category } from "@panel/shared";
import { Badge } from "@/components/ui/badge";
import { CrudPage } from "@/components/crud/crud-page";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { categoriesResource } from "./categories.resource";
import { CategoryForm } from "./category-form";

const columns: DataTableColumn<Category>[] = [
  {
    id: "position",
    header: "Posición",
    sortKey: "position",
    cell: (c) => <span className="tabular-nums text-muted-foreground">{c.position}</span>,
    className: "w-24",
  },
  {
    id: "name",
    header: "Nombre",
    sortKey: "name",
    cell: (c) => <span className="font-medium">{c.name}</span>,
  },
  {
    id: "children",
    header: "Subcategorías",
    sortKey: "childrenCount",
    cell: (c) => (
      <Badge variant="outline">
        {c.childrenCount} {c.childrenCount === 1 ? "subcategoría" : "subcategorías"}
      </Badge>
    ),
  },
  {
    id: "parent",
    header: "Categoría padre",
    sortKey: "parent",
    cell: (c) =>
      c.parent ? (
        <Badge variant="info">{c.parent.name}</Badge>
      ) : (
        <Badge variant="success">Principal</Badge>
      ),
  },
  {
    id: "products",
    header: "Productos",
    cell: (c) => <span className="tabular-nums">{c.productsCount}</span>,
    className: "w-24",
  },
];

export function CategoriesView() {
  return (
    <CrudPage
      resource={categoriesResource}
      description="Organizá el catálogo en categorías y subcategorías."
      columns={columns}
      getItemLabel={(c) => c.name}
      renderForm={(props) => <CategoryForm {...props} />}
      viewHref={(c) => `/productos?categoryId=${c.id}`}
      viewTooltip="Ver productos"
      deleteDescription={(c) =>
        c.childrenCount > 0
          ? `Tiene ${c.childrenCount} subcategoría(s): primero eliminalas o movelas a otra categoría.`
          : c.productsCount > 0
            ? `Sus ${c.productsCount} producto(s) quedarán sin categoría. Esta acción no se puede deshacer.`
            : "Esta acción no se puede deshacer."
      }
    />
  );
}
