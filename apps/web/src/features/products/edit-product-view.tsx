"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceDetail } from "@/hooks/use-resource";
import { getErrorMessage } from "@/lib/api-client";
import { ProductForm } from "./product-form";
import { productsResource } from "./products.resource";

export function EditProductView({ id }: { id: string }) {
  const { data: product, isPending, isError, error } = useResourceDetail(productsResource, id);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No pudimos cargar el producto</EmptyTitle>
          <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/productos">Volver a productos</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // key: si cambia el producto, el formulario se reinicia con sus valores.
  return <ProductForm key={product.id + product.updatedAt} product={product} />;
}
