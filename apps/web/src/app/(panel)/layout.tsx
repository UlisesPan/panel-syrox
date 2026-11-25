import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {/* Las vistas leen filtros/paginación de la URL (useSearchParams) */}
            <Suspense>{children}</Suspense>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
