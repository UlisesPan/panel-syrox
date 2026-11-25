import type { Product, ProductDetail, ProductInput } from "@panel/shared";
import { defineResource } from "@/lib/resource";

export const productsResource = defineResource<Product, ProductInput, ProductDetail>({
  key: "products",
  endpoint: "/products",
  labels: { singular: "Producto", plural: "Productos", gender: "m" },
  // Edición = reemplazo completo (opciones y variantes incluidas).
  updateMethod: "PUT",
  invalidates: ["dashboard", "categories", "brands"],
});
