"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { saleInputSchema, type SaleProductOption } from "@panel/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FormActions } from "@/components/form/form-actions";
import { FormField, SelectField, TextareaField, TextField } from "@/components/form/form-field";
import { PageHeader } from "@/components/crud/page-header";
import { useResourceMutations } from "@/hooks/use-resource";
import { formatCurrency } from "@/lib/format";
import { handleFormError } from "@/lib/form-errors";
import { paymentMethodLabels, paymentStatusMeta, toOptions } from "@/lib/labels";
import { ProductPicker } from "./product-picker";
import { salesResource } from "./sales.resource";

const emptyItem = { productId: "", variantId: null, quantity: 1 };

/**
 * "Generar venta". El total que se ve es solo una previsualización:
 * la API recalcula todos los precios desde la base al registrar la venta.
 */
export function NewSaleForm() {
  const router = useRouter();
  const { create } = useResourceMutations(salesResource);
  // Productos elegidos en los pickers (para mostrar nombre, variantes y precio).
  const [selected, setSelected] = useState<Record<string, SaleProductOption>>({});

  const form = useForm({
    resolver: zodResolver(saleInputSchema),
    defaultValues: {
      customerName: "",
      customerEmail: null,
      customerPhone: null,
      shippingAddress: null,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      notes: null,
      items: [emptyItem],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" });

  const unitPriceOf = (item: (typeof watchedItems)[number]) => {
    const product = selected[item.productId];
    if (!product) return 0;
    const variant = product.variants.find((v) => v.id === item.variantId);
    return variant?.price ?? product.price;
  };
  const total = watchedItems.reduce((sum, item) => sum + unitPriceOf(item) * (Number(item.quantity) || 0), 0);

  const submit = form.handleSubmit(async (values) => {
    // Regla que depende de datos del catálogo (no del schema): si el producto tiene variantes, elegir una.
    const missingVariant = values.items.findIndex(
      (item) => (selected[item.productId]?.variants.length ?? 0) > 0 && !item.variantId,
    );
    if (missingVariant !== -1) {
      form.setError(`items.${missingVariant}.variantId`, { message: "Elegí una variante" });
      return;
    }
    try {
      const sale = await create.mutateAsync(values);
      router.push(`/ventas?sale=${sale.id}`);
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <PageHeader title="Generar venta" description="Registrá una venta seleccionando productos y cantidades." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Los precios se toman del catálogo al momento de registrar la venta.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {items.fields.map((field, index) => {
                const item = watchedItems[index];
                const product = item ? selected[item.productId] : undefined;
                const unitPrice = item ? unitPriceOf(item) : 0;
                return (
                  <div key={field.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-12 sm:items-start">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      label="Producto"
                      className="sm:col-span-5"
                      render={(f, { id, invalid }) => (
                        <ProductPicker
                          id={id}
                          invalid={invalid}
                          value={product ?? null}
                          onChange={(p) => {
                            setSelected((prev) => ({ ...prev, [p.id]: p }));
                            f.onChange(p.id);
                            form.setValue(`items.${index}.variantId`, null);
                          }}
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.variantId`}
                      label="Variante"
                      className="sm:col-span-3"
                      render={(f, { id, invalid }) => (
                        <Select
                          value={f.value ?? ""}
                          onValueChange={f.onChange}
                          disabled={!product || product.variants.length === 0}
                        >
                          <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
                            <SelectValue placeholder={product?.variants.length ? "Elegí una" : "Sin variantes"} />
                          </SelectTrigger>
                          <SelectContent>
                            {product?.variants.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      label="Cant."
                      className="sm:col-span-2"
                      render={(f, { id, invalid }) => (
                        <Input
                          {...f}
                          value={(f.value as number | "") ?? ""}
                          id={id}
                          type="number"
                          min={1}
                          max={999}
                          aria-invalid={invalid}
                          onChange={(e) => f.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}
                        />
                      )}
                    />
                    <div className="flex items-end justify-between gap-2 sm:col-span-2 sm:h-full sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {product ? formatCurrency(unitPrice) : "—"} c/u
                        </p>
                        <p className="font-semibold tabular-nums">
                          {formatCurrency(unitPrice * (Number(item?.quantity) || 0))}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => items.remove(index)}
                        disabled={items.fields.length === 1}
                        aria-label={`Quitar ítem ${index + 1}`}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {form.formState.errors.items?.root && <FieldError errors={[form.formState.errors.items.root]} />}
              {form.formState.errors.items?.message && <FieldError>{form.formState.errors.items.message}</FieldError>}
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => items.append(emptyItem)}
                disabled={items.fields.length >= 50}
              >
                <PlusIcon /> Agregar producto
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Cliente, envío y pago</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField control={form.control} name="customerName" label="Nombre del cliente" required />
              <FormField
                control={form.control}
                name="customerEmail"
                label="Email"
                render={(f, { id, invalid }) => (
                  <Input
                    {...f}
                    id={id}
                    type="email"
                    placeholder="cliente@mail.com"
                    value={f.value ?? ""}
                    onChange={(e) => f.onChange(e.target.value === "" ? null : e.target.value)}
                    aria-invalid={invalid}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                label="Teléfono"
                render={(f, { id, invalid }) => (
                  <Input
                    {...f}
                    id={id}
                    type="tel"
                    autoComplete="tel"
                    placeholder="55 1234 5678"
                    value={f.value ?? ""}
                    onChange={(e) => f.onChange(e.target.value === "" ? null : e.target.value)}
                    aria-invalid={invalid}
                  />
                )}
              />
              <TextareaField
                control={form.control}
                name="shippingAddress"
                label="Dirección de envío"
                placeholder="Calle, número, colonia, ciudad, CP"
                rows={2}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="paymentMethod"
                  label="Medio de pago"
                  options={toOptions(paymentMethodLabels)}
                />
                <SelectField
                  control={form.control}
                  name="paymentStatus"
                  label="Estado del pago"
                  options={toOptions(paymentStatusMeta)}
                />
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">Solo informativo: no se procesan pagos.</p>
              <TextareaField control={form.control} name="notes" label="Notas" rows={2} />
            </FieldGroup>
          </CardContent>
          <Separator />
          <CardFooter className="flex-col items-stretch gap-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total estimado</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
            <FormActions
              submitLabel="Generar venta"
              isPending={create.isPending}
              onCancel={() => router.back()}
              className="[&>button]:flex-1"
            />
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
