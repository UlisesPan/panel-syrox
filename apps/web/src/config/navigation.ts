import {
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingCartIcon,
  TagIcon,
  UsersIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Módulos del panel. Agregar una sección nueva = agregar una entrada acá + su carpeta en app/(panel).
 * El sidebar y los breadcrumbs se generan a partir de esta lista.
 */
export const navigation: NavItem[] = [
  { title: "Inicio", href: "/", icon: HomeIcon },
  { title: "Ventas", href: "/ventas", icon: ShoppingCartIcon },
  { title: "Categorías", href: "/categorias", icon: WorkflowIcon },
  { title: "Marcas", href: "/marcas", icon: TagIcon },
  { title: "Productos", href: "/productos", icon: PackageIcon },
  { title: "Clientes", href: "/clientes", icon: UsersIcon },
  { title: "Configuración", href: "/configuracion", icon: SettingsIcon },
];

/** Etiquetas para segmentos de URL que no son módulos (breadcrumbs). */
export const segmentLabels: Record<string, string> = {
  nuevo: "Nuevo",
  nueva: "Nueva",
  editar: "Editar",
};
