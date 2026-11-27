"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, PlusIcon, SearchIcon, ShoppingCartIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navigationFor } from "@/config/navigation";
import { useSessionUser } from "@/features/auth/use-session";

const quickActions = [
  { label: "Generar venta", href: "/ventas/nueva", icon: ShoppingCartIcon },
  { label: "Nuevo producto", href: "/productos/nuevo", icon: PlusIcon },
];

/** Paleta de comandos (Ctrl/⌘ + K): navegación y acciones rápidas desde el teclado. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { data: user } = useSessionUser();
  const isAdmin = user?.role === "ADMIN";
  const items = user ? navigationFor(user.role) : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground md:flex"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Buscar">
        <SearchIcon />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Navegá o ejecutá una acción">
        <Command>
          <CommandInput placeholder="¿A dónde querés ir?" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            {isAdmin && (
              <>
                <CommandGroup heading="Acciones">
                  {quickActions.map((action) => (
                    <CommandItem key={action.href} onSelect={() => run(() => router.push(action.href))}>
                      <action.icon />
                      {action.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Ir a">
              {items.map((item) => (
                <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Tema">
              <CommandItem onSelect={() => run(() => setTheme("light"))}>
                <SunIcon /> Claro
              </CommandItem>
              <CommandItem onSelect={() => run(() => setTheme("dark"))}>
                <MoonIcon /> Oscuro
              </CommandItem>
              <CommandItem onSelect={() => run(() => setTheme("system"))}>
                <MonitorIcon /> Sistema
                <CommandShortcut>auto</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
