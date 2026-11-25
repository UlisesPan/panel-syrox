"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { navigation, segmentLabels } from "@/config/navigation";

/** Los ids (cuid) no aportan al breadcrumb: se omiten. */
const isId = (segment: string) => /^c[a-z0-9]{20,}$/.test(segment);

/** Breadcrumbs generados desde la URL y la configuración de navegación. */
export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = [{ href: "/", label: "Inicio" }];
  segments.forEach((segment, index) => {
    if (isId(segment)) return;
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = navigation.find((n) => n.href === href)?.title ?? segmentLabels[segment] ?? segment;
    crumbs.push({ href, label });
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
