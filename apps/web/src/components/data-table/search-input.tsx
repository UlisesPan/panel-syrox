"use client";

import { useEffect, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Búsqueda con debounce: no dispara un request por cada tecla. */
export function SearchInput({ value, onChange, placeholder = "Buscar…", className }: SearchInputProps) {
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const debounced = useDebouncedValue(text, 350);

  // Si la URL cambia desde afuera (ej: "Limpiar filtros"), sincronizamos el input durante el render.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value);
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reaccionamos al valor debounced
  }, [debounced]);

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {text && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={() => setText("")} aria-label="Limpiar búsqueda">
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
