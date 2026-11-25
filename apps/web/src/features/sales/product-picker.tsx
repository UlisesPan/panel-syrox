"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, PackageIcon } from "lucide-react";
import type { SaleProductOption } from "@panel/shared";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSaleProductOptions } from "./sales.resource";

interface ProductPickerProps {
  value: SaleProductOption | null;
  onChange: (product: SaleProductOption) => void;
  invalid?: boolean;
  id?: string;
}

/** Combobox con búsqueda en el servidor: escala a catálogos grandes sin cargar todo. */
export function ProductPicker({ value, onChange, invalid, id }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const { data = [], isFetching } = useSaleProductOptions(debounced);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? value.name : "Buscar producto…"}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        {/* El filtrado lo hace la API, no cmdk */}
        <Command shouldFilter={false}>
          <CommandInput placeholder="Nombre o SKU…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isFetching && data.length === 0 ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>No se encontraron productos activos.</CommandEmpty>
            )}
            <CommandGroup>
              {data.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => {
                    onChange(product);
                    setOpen(false);
                  }}
                >
                  <PackageIcon className="text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku ?? "Sin SKU"}
                      {product.variants.length > 0 && ` · ${product.variants.length} variantes`}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums">{formatCurrency(product.price)}</span>
                  <CheckIcon className={cn("ml-1", value?.id === product.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
