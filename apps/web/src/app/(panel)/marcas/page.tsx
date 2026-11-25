import type { Metadata } from "next";
import { BrandsView } from "@/features/brands/brands-view";

export const metadata: Metadata = { title: "Marcas" };

export default function BrandsPage() {
  return <BrandsView />;
}
