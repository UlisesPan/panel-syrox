import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  productFiltersSchema,
  productInputSchema,
  variantLabel,
  type ListQuery,
  type Paginated,
  type Product,
  type ProductDetail,
} from '@panel/shared';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';
import { uniqueSlug } from '../common/utils/unique-slug.js';
import { toMoney } from '../common/utils/decimal.js';

type ProductDto = z.output<typeof productInputSchema>;
type ProductListQuery = ListQuery & z.output<typeof productFiltersSchema>;

const listInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  ...listInclude,
  options: { orderBy: { position: 'asc' } },
  variants: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof listInclude }>;
type ProductDetailRow = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

const toDto = (p: ProductRow): Product => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: toMoney(p.price),
  sku: p.sku,
  status: p.status,
  images: p.images,
  category: p.category,
  brand: p.brand,
  variantsCount: p._count.variants,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

const toDetailDto = (p: ProductDetailRow): ProductDetail => ({
  ...toDto(p),
  options: p.options.map(({ id, name, position, values }) => ({ id, name, position, values })),
  variants: p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    price: toMoney(v.price),
    options: v.options as Record<string, string>,
  })),
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductListQuery): Promise<Paginated<Product>> {
    const where: Prisma.ProductWhereInput = {
      status: query.status,
      categoryId: query.categoryId,
      brandId: query.brandId,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const orderBy = resolveOrderBy<Prisma.ProductOrderByWithRelationInput>(
      query,
      {
        name: (dir) => ({ name: dir }),
        price: (dir) => ({ price: dir }),
        status: (dir) => ({ status: dir }),
        category: (dir) => ({ category: { name: dir } }),
        brand: (dir) => ({ brand: { name: dir } }),
        createdAt: (dir) => ({ createdAt: dir }),
      },
      { createdAt: 'desc' },
    );

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy, include: listInclude, ...paginationArgs(query) }),
      this.prisma.product.count({ where }),
    ]);
    return toPaginated(items.map(toDto), total, query);
  }

  /** Productos activos con sus variantes, para el formulario de "Generar venta". */
  async saleOptions(search?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        images: true,
        variants: { select: { id: true, sku: true, price: true, options: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: toMoney(p.price),
      image: p.images[0] ?? null,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        label: variantLabel(v.options as Record<string, string>),
        price: toMoney(v.price ?? p.price),
      })),
    }));
  }

  async findOne(id: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: detailInclude });
    if (!product) throw new NotFoundException('El producto no existe.');
    return toDetailDto(product);
  }

  async create(dto: ProductDto): Promise<ProductDetail> {
    await this.assertRelations(dto);
    const slug = await this.buildSlug(dto.name);
    const { options, variants, ...data } = dto;

    const product = await this.prisma.product.create({
      data: {
        ...data,
        slug,
        options: { create: options.map((o, position) => ({ ...o, position })) },
        variants: { create: variants },
      },
      include: detailInclude,
    });
    return toDetailDto(product);
  }

  /**
   * Reemplazo completo (PUT). Las variantes se sincronizan por SKU para conservar
   * sus ids: así las ventas históricas siguen apuntando a la misma variante.
   */
  async update(id: string, dto: ProductDto): Promise<ProductDetail> {
    const current = await this.prisma.product.findUnique({ where: { id }, select: { name: true } });
    if (!current) throw new NotFoundException('El producto no existe.');
    await this.assertRelations(dto);

    const slug = dto.name !== current.name ? await this.buildSlug(dto.name, id) : undefined;
    const { options, variants, ...data } = dto;
    const skus = variants.map((v) => v.sku);

    const product = await this.prisma.$transaction(async (tx) => {
      // El upsert por SKU no debe "robar" la variante de otro producto.
      const taken = await tx.productVariant.findFirst({
        where: { sku: { in: skus }, productId: { not: id } },
        select: { sku: true },
      });
      if (taken) throw new ConflictException(`El SKU "${taken.sku}" ya pertenece a otro producto.`);

      await tx.productOption.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id, sku: { notIn: skus } } });
      for (const variant of variants) {
        await tx.productVariant.upsert({
          where: { sku: variant.sku },
          create: { ...variant, productId: id },
          update: { price: variant.price, options: variant.options },
        });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          slug,
          options: { create: options.map((o, position) => ({ ...o, position })) },
        },
        include: detailInclude,
      });
    });

    return toDetailDto(product);
  }

  /** Las ventas conservan el snapshot del producto (SaleItem.productId → null). */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  private async assertRelations(dto: Pick<ProductDto, 'categoryId' | 'brandId'>) {
    const [category, brand] = await Promise.all([
      dto.categoryId ? this.prisma.category.count({ where: { id: dto.categoryId } }) : 1,
      dto.brandId ? this.prisma.brand.count({ where: { id: dto.brandId } }) : 1,
    ]);
    if (!category) throw new BadRequestException('La categoría seleccionada no existe.');
    if (!brand) throw new BadRequestException('La marca seleccionada no existe.');
  }

  private buildSlug(name: string, excludeId?: string) {
    return uniqueSlug(name, async (slug) =>
      Boolean(await this.prisma.product.count({ where: { slug, id: excludeId ? { not: excludeId } : undefined } })),
    );
  }
}
