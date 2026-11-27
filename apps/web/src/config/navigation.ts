import {
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  ShieldUserIcon,
  ShoppingCartIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@panel/shared";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Roles que ven la sección. Sin definir = solo ADMIN (la API aplica la misma regla). */
  roles?: UserRole[];
}

/**
 * Módulos del panel. Agregar una sección nueva = agregar una entrada acá + su carpeta en app/(panel).
 * El sidebar, los breadcrumbs, la paleta de comandos y el control de acceso por rol salen de esta lista.
 */
export const navigation: NavItem[] = [
  { title: "Inicio", href: "/", icon: HomeIcon },
  { title: "Mis entregas", href: "/entregas", icon: TruckIcon, roles: ["COURIER"] },
  { title: "Ventas", href: "/ventas", icon: ShoppingCartIcon },
  { title: "Categorías", href: "/categorias", icon: WorkflowIcon },
  { title: "Marcas", href: "/marcas", icon: TagIcon },
  { title: "Productos", href: "/productos", icon: PackageIcon },
  { title: "Clientes", href: "/clientes", icon: UsersIcon },
  { title: "Usuarios", href: "/usuarios", icon: ShieldUserIcon },
  { title: "Configuración", href: "/configuracion", icon: SettingsIcon, roles: ["ADMIN", "COURIER"] },
];

const allows = (item: NavItem, role: UserRole) => (item.roles ?? ["ADMIN"]).includes(role);

export const navigationFor = (role: UserRole) => navigation.filter((item) => allows(item, role));

/** Página de inicio de cada rol. */
export const homeFor = (role: UserRole) => (role === "COURIER" ? "/entregas" : "/");

/** La sección se busca por prefijo (ej: /ventas/nueva pertenece a /ventas). */
export function canAccess(role: UserRole, pathname: string) {
  const section = navigation
    .filter((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return section ? allows(section, role) : role === "ADMIN";
}

/** Etiquetas para segmentos de URL que no son módulos (breadcrumbs). */
export const segmentLabels: Record<string, string> = {
  nuevo: "Nuevo",
  nueva: "Nueva",
  editar: "Editar",
};
