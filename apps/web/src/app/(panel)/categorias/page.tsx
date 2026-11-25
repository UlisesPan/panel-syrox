import type { Metadata } from "next";
import { CategoriesView } from "@/features/categories/categories-view";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriesPage() {
  return <CategoriesView />;
}
