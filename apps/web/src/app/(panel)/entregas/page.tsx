import type { Metadata } from "next";
import { DeliveriesView } from "@/features/deliveries/deliveries-view";

export const metadata: Metadata = { title: "Mis entregas" };

export default function DeliveriesPage() {
  return <DeliveriesView />;
}
