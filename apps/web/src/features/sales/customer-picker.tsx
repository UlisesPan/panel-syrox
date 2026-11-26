"use client";

import { useState } from "react";
import { ChevronsUpDownIcon, UserRoundSearchIcon } from "lucide-react";
import type { Customer } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { initials } from "@/lib/format";
import { useCustomerSearch } from "./sales.resource";

/** Busca clientes de ventas anteriores para completar sus datos de un clic. */
export function CustomerPicker({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const { data = [], isFetching } = useCustomerSearch(debounced);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <span className="flex items-center gap-2">
            <UserRoundSearchIcon />
            Elegir un cliente anterior
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Nombre o email…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isFetching && data.length === 0 ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>No hay clientes que coincidan.</CommandEmpty>
            )}
            <CommandGroup>
              {data.map((customer) => (
                <CommandItem
                  key={customer.key}
                  value={customer.key}
                  onSelect={() => {
                    onSelect(customer);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                    {initials(customer.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{customer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {customer.email ?? "Sin email"} · {customer.ordersCount}{" "}
                      {customer.ordersCount === 1 ? "pedido" : "pedidos"}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
