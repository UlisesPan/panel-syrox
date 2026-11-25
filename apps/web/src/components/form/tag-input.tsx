"use client";

import { useState, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  max?: number;
}

/** Input de "chips": Enter o coma agregan un valor, Backspace en vacío borra el último. */
export function TagInput({ value, onChange, placeholder, id, invalid, max = 20 }: TagInputProps) {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return setText("");
    onChange([...value, tag]);
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(text);
    } else if (event.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== tag))}
            className="rounded-full p-0.5 hover:bg-foreground/10"
            aria-label={`Quitar ${tag}`}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(text)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
        aria-invalid={invalid}
      />
    </div>
  );
}
