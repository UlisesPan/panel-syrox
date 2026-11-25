import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { CommandMenu } from "./command-menu";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-1">
        <CommandMenu />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
