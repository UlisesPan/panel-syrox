import type { Metadata } from "next";
import { EditProductView } from "@/features/products/edit-product-view";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: PageProps<"/productos/[id]/editar">) {
  const { id } = await params;
  return <EditProductView id={id} />;
}
