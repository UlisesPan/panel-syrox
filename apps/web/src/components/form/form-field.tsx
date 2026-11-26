"use client";

import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "./password-input";

interface BaseFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>;
  name: N;
  label?: string;
  description?: ReactNode;
  required?: boolean;
  className?: string;
}

interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> extends BaseFieldProps<T, N> {
  render: (field: ControllerRenderProps<T, N>, meta: { id: string; invalid: boolean }) => ReactNode;
}

/**
 * Pieza base de todos los formularios: conecta react-hook-form con los componentes
 * de shadcn (label, descripción y error accesibles). Los campos específicos de abajo
 * son atajos construidos sobre este.
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  className,
  render,
}: FormFieldProps<T, N>) {
  // useId: dos formularios en la misma página pueden tener campos con el mismo nombre.
  const id = `field-${String(name).replace(/\./g, "-")}-${useId().replace(/:/g, "")}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          {label && (
            <FieldLabel htmlFor={id}>
              {label}
              {required && <span className="text-destructive">*</span>}
            </FieldLabel>
          )}
          {render(field, { id, invalid: fieldState.invalid })}
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function TextField<T extends FieldValues, N extends FieldPath<T>>({
  placeholder,
  type = "text",
  autoComplete,
  autoFocus,
  ...props
}: BaseFieldProps<T, N> & {
  placeholder?: string;
  type?: "text" | "email" | "password" | "url";
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <FormField
      {...props}
      render={(field, { id, invalid }) => {
        const inputProps = {
          ...field,
          value: field.value ?? "",
          id,
          placeholder,
          autoComplete,
          autoFocus,
          "aria-invalid": invalid,
        };
        return type === "password" ? <PasswordInput {...inputProps} /> : <Input {...inputProps} type={type} />;
      }}
    />
  );
}

export function NumberField<T extends FieldValues, N extends FieldPath<T>>({
  placeholder,
  min,
  step,
  ...props
}: BaseFieldProps<T, N> & { placeholder?: string; min?: number; step?: number | "any" }) {
  return (
    <FormField
      {...props}
      render={(field, { id, invalid }) => (
        <Input
          {...field}
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          placeholder={placeholder}
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}
          aria-invalid={invalid}
        />
      )}
    />
  );
}

export function TextareaField<T extends FieldValues, N extends FieldPath<T>>({
  placeholder,
  rows = 3,
  ...props
}: BaseFieldProps<T, N> & { placeholder?: string; rows?: number }) {
  return (
    <FormField
      {...props}
      render={(field, { id, invalid }) => (
        <Textarea
          {...field}
          // El schema usa null para "vacío"; el textarea necesita string.
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
          id={id}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={invalid}
        />
      )}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

const NONE = "__none__";

/** Select controlado. Con `nullableLabel` agrega una opción que guarda `null` (ej: "Sin marca"). */
export function SelectField<T extends FieldValues, N extends FieldPath<T>>({
  options,
  placeholder = "Seleccioná una opción",
  nullableLabel,
  disabled,
  ...props
}: BaseFieldProps<T, N> & {
  options: SelectOption[];
  placeholder?: string;
  nullableLabel?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      {...props}
      render={(field, { id, invalid }) => (
        <Select
          value={field.value === null ? (nullableLabel ? NONE : "") : (field.value ?? "")}
          onValueChange={(value) => field.onChange(value === NONE ? null : value)}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={invalid} onBlur={field.onBlur}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {nullableLabel && <SelectItem value={NONE}>{nullableLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
