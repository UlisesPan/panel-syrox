import type { Metadata } from "next";
import { NewSaleForm } from "@/features/sales/new-sale-form";

export const metadata: Metadata = { title: "Generar venta" };

export default function NewSalePage() {
  return <NewSaleForm />;
}
