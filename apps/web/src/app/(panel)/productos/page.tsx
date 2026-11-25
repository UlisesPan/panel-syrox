import type { Metadata } from "next";
import { ProductsView } from "@/features/products/products-view";

export const metadata: Metadata = { title: "Productos" };

export default function ProductsPage() {
  return <ProductsView />;
}
