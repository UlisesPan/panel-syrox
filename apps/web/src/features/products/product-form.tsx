"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlusIcon, PlusCircleIcon, Trash2Icon, WandSparklesIcon, XIcon } from "lucide-react";
import {
  PRODUCT_STATUSES,
  buildVariantCombinations,
  productInputSchema,
  suggestVariantSku,
  variantKey,
  variantLabel,
  type ProductDetail,
  type ProductInput,
} from "@panel/shared";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormActions } from "@/components/form/form-actions";
import { FormField, NumberField, SelectField, TextareaField, TextField } from "@/components/form/form-field";
import { TagInput } from "@/components/form/tag-input";
import { PageHeader } from "@/components/crud/page-header";
import { ProductThumb } from "@/components/product-thumb";
import { useResourceMutations } from "@/hooks/use-resource";
import { siteConfig } from "@/config/site";
import { handleFormError } from "@/lib/form-errors";
import { productStatusMeta } from "@/lib/labels";
import { useBrandOptions } from "@/features/brands/brands.resource";
import { useCategoryOptions } from "@/features/categories/categories.resource";
import { productsResource } from "./products.resource";

type FormValues = z.input<typeof productInputSchema>;
type Form = UseFormReturn<FormValues, unknown, z.output<typeof productInputSchema>>;

function toFormValues(product?: ProductDetail): FormValues {
  return {
    name: product?.name ?? "",
    description: product?.description ?? null,
    price: product?.price ?? ("" as unknown as number),
    sku: product?.sku ?? null,
    status: product?.status ?? "ACTIVE",
    categoryId: product?.category?.id ?? null,
    brandId: product?.brand?.id ?? null,
    images: product?.images ?? [],
    options: product?.options.map(({ name, values }) => ({ name, values })) ?? [],
    variants: product?.variants.map(({ sku, price, options }) => ({ sku, price, options })) ?? [],
  };
}

/** Alta y edición de productos (la misma pantalla para ambos casos). */
export function ProductForm({ product }: { product?: ProductDetail }) {
  const router = useRouter();
  const { create, update } = useResourceMutations(productsResource);
  const { data: categories = [] } = useCategoryOptions();
  const { data: brands = [] } = useBrandOptions();

  const form: Form = useForm({
    resolver: zodResolver(productInputSchema),
    defaultValues: toFormValues(product),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      if (product) await update.mutateAsync({ id: product.id, input: values as ProductInput });
      else await create.mutateAsync(values as ProductInput);
      router.push("/productos");
    } catch (error) {
      handleFormError(error, form.setError);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title={product ? "Editar producto" : "Crear producto"}
        description={product ? product.name : "Completá la información y, si aplica, sus variantes."}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <TextField control={form.control} name="name" label="Nombre del producto" required autoFocus />
                <TextareaField
                  control={form.control}
                  name="description"
                  label="Descripción"
                  placeholder="Descripción detallada del producto"
                  rows={4}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="price"
                    label={`Precio (${siteConfig.currency})`}
                    min={0}
                    step="any"
                    required
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    label="SKU"
                    description="Código interno. Sirve de base para los SKU de las variantes."
                    render={(f, { id, invalid }) => (
                      <Input
                        {...f}
                        id={id}
                        value={f.value ?? ""}
                        onChange={(e) => f.onChange(e.target.value === "" ? null : e.target.value.toUpperCase())}
                        aria-invalid={invalid}
                      />
                    )}
                  />
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <ImagesCard form={form} />
          <OptionsCard control={form.control} />
          <VariantsCard form={form} />
        </div>

        <div className="flex flex-col gap-6">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Organización</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SelectField
                  control={form.control}
                  name="status"
                  label="Estado"
                  options={PRODUCT_STATUSES.map((s) => ({ value: s, label: productStatusMeta[s].label }))}
                  description="Solo los productos activos se pueden vender."
                />
                <SelectField
                  control={form.control}
                  name="categoryId"
                  label="Categoría"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  nullableLabel="Sin categoría"
                />
                <SelectField
                  control={form.control}
                  name="brandId"
                  label="Marca"
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  nullableLabel="Sin marca"
                />
                <FormActions
                  submitLabel={product ? "Guardar cambios" : "Crear producto"}
                  isPending={create.isPending || update.isPending}
                  onCancel={() => router.back()}
                  className="[&>button]:flex-1"
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function ImagesCard({ form }: { form: Form }) {
  const images = useWatch({ control: form.control, name: "images" }) ?? [];
  const [url, setUrl] = useState("");
  const error = form.formState.errors.images;

  const add = () => {
    const value = url.trim();
    if (!value) return;
    try {
      new URL(value);
    } catch {
      form.setError("images", { message: "Ingresá una URL válida (https://…)" });
      return;
    }
    form.clearErrors("images");
    form.setValue("images", [...images, value], { shouldDirty: true });
    setUrl("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imágenes del producto</CardTitle>
        <CardDescription>Pegá la URL de cada imagen. La primera se usa como portada.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <InputGroup>
            <InputGroupAddon>
              <ImagePlusIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="https://…"
              aria-label="URL de imagen"
              disabled={images.length >= 8}
            />
          </InputGroup>
          <Button type="button" variant="outline" onClick={add} disabled={images.length >= 8}>
            Agregar
          </Button>
        </div>
        {error && (
          <FieldError>
            {error.message ?? (Array.isArray(error) ? error.find(Boolean)?.message : undefined)}
          </FieldError>
        )}
        {images.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((src, index) => (
              <li key={src} className="group relative">
                <ProductThumb src={src} alt={`Imagen ${index + 1}`} className="aspect-square size-full" />
                {index === 0 && (
                  <Badge className="absolute bottom-1 left-1" variant="secondary">
                    Portada
                  </Badge>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  className="absolute top-1 right-1 opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() =>
                    form.setValue(
                      "images",
                      images.filter((_, i) => i !== index),
                      { shouldDirty: true },
                    )
                  }
                  aria-label={`Quitar imagen ${index + 1}`}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OptionsCard({ control }: { control: Control<FormValues> }) {
  const options = useFieldArray({ control, name: "options" });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opciones del producto</CardTitle>
        <CardDescription>Definí las características que tendrán variaciones (ej: Color, Talla).</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => options.append({ name: "", values: [] })}
            disabled={options.fields.length >= 3}
          >
            <PlusCircleIcon /> Agregar opción
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {options.fields.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin opciones: el producto se vende con un único SKU.
          </p>
        )}
        {options.fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 rounded-lg border-l-4 border-l-brand/60 bg-muted/30 p-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-[180px_1fr]">
              <TextField control={control} name={`options.${index}.name`} label="Nombre" placeholder="Ej: Color" />
              <FormField
                control={control}
                name={`options.${index}.values`}
                label="Valores"
                description="Enter o coma para agregar."
                render={(f, { id, invalid }) => (
                  <TagInput
                    id={id}
                    value={f.value ?? []}
                    onChange={f.onChange}
                    invalid={invalid}
                    placeholder="Ej: Rojo, Azul…"
                  />
                )}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => options.remove(index)}
              aria-label={`Eliminar opción ${index + 1}`}
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Las variantes se generan automáticamente a partir de las opciones (producto cartesiano).
 * Si una combinación ya existía, conserva su SKU y precio.
 */
function VariantsCard({ form }: { form: Form }) {
  const options = useWatch({ control: form.control, name: "options" }) ?? [];
  const variants = useWatch({ control: form.control, name: "variants" }) ?? [];
  const optionsSignature = JSON.stringify(options);

  useEffect(() => {
    const combos = buildVariantCombinations(options.map((o) => ({ name: o.name, values: o.values ?? [] })));
    const current = form.getValues("variants") ?? [];
    const byKey = new Map(current.map((v) => [variantKey(v.options), v]));
    const baseSku = form.getValues("sku") ?? "";
    const next = combos.map(
      (combo) => byKey.get(variantKey(combo)) ?? { sku: suggestVariantSku(baseSku, combo), price: null, options: combo },
    );
    const changed =
      next.length !== current.length || next.some((v, i) => variantKey(v.options) !== variantKey(current[i]!.options));
    if (changed) form.setValue("variants", next, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se recalcula solo cuando cambian las opciones
  }, [optionsSignature]);

  const regenerateSkus = () => {
    const baseSku = form.getValues("sku") ?? "";
    form.setValue(
      "variants",
      variants.map((v) => ({ ...v, sku: suggestVariantSku(baseSku, v.options) })),
      { shouldDirty: true },
    );
  };

  const variantsError = form.formState.errors.variants;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variantes del producto</CardTitle>
        <CardDescription>
          {variants.length
            ? `${variants.length} combinaciones. Dejá el precio vacío para usar el del producto.`
            : "Definí opciones del producto para generar variantes automáticamente."}
        </CardDescription>
        <CardAction>
          {variants.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={regenerateSkus}>
              <WandSparklesIcon /> Generar SKUs
            </Button>
          ) : (
            <Badge variant="outline">SKU único</Badge>
          )}
        </CardAction>
      </CardHeader>
      {variants.length > 0 && (
        <CardContent className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Variante</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="w-40">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, index) => (
                  <TableRow key={variantKey(variant.options)}>
                    <TableCell className="font-medium">{variantLabel(variant.options)}</TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`variants.${index}.sku`}
                        render={(f, { id, invalid }) => (
                          <Input
                            {...f}
                            id={id}
                            className="h-7 font-mono text-xs"
                            onChange={(e) => f.onChange(e.target.value.toUpperCase())}
                            aria-invalid={invalid}
                            aria-label={`SKU de ${variantLabel(variant.options)}`}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`variants.${index}.price`}
                        render={(f, { id, invalid }) => (
                          <Input
                            {...f}
                            id={id}
                            type="number"
                            min={0}
                            step="any"
                            className="h-7"
                            placeholder="Hereda"
                            value={(f.value as number | null) ?? ""}
                            onChange={(e) => f.onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
                            aria-invalid={invalid}
                            aria-label={`Precio de ${variantLabel(variant.options)}`}
                          />
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {variantsError?.message && <FieldError>{variantsError.message}</FieldError>}
        </CardContent>
      )}
    </Card>
  );
}
