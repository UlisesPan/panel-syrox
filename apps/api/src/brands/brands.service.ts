import { Injectable, NotFoundException } from '@nestjs/common';
import type { Brand, EntityRef, ListQuery, Paginated } from '@panel/shared';
import { brandInputSchema, brandUpdateSchema } from '@panel/shared';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { containsInsensitive, paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';
import { uniqueSlug } from '../common/utils/unique-slug.js';

type CreateDto = z.output<typeof brandInputSchema>;
type UpdateDto = z.output<typeof brandUpdateSchema>;

const include = { _count: { select: { products: true } } } satisfies Prisma.BrandInclude;
type BrandWithCount = Prisma.BrandGetPayload<{ include: typeof include }>;

const toDto = (b: BrandWithCount): Brand => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  productsCount: b._count.products,
  createdAt: b.createdAt.toISOString(),
  updatedAt: b.updatedAt.toISOString(),
});

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQuery): Promise<Paginated<Brand>> {
    const where: Prisma.BrandWhereInput = { name: containsInsensitive(query.search) };
    const orderBy = resolveOrderBy<Prisma.BrandOrderByWithRelationInput>(
      query,
      {
        name: (dir) => ({ name: dir }),
        productsCount: (dir) => ({ products: { _count: dir } }),
        createdAt: (dir) => ({ createdAt: dir }),
      },
      { name: 'asc' },
    );
    const [items, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({ where, orderBy, include, ...paginationArgs(query) }),
      this.prisma.brand.count({ where }),
    ]);
    return toPaginated(items.map(toDto), total, query);
  }

  options(): Promise<EntityRef[]> {
    return this.prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.prisma.brand.findUnique({ where: { id }, include });
    if (!brand) throw new NotFoundException('La marca no existe.');
    return toDto(brand);
  }

  async create(dto: CreateDto): Promise<Brand> {
    const slug = await this.buildSlug(dto.name);
    return toDto(await this.prisma.brand.create({ data: { ...dto, slug }, include }));
  }

  async update(id: string, dto: UpdateDto): Promise<Brand> {
    await this.findOne(id);
    const slug = dto.name ? await this.buildSlug(dto.name, id) : undefined;
    return toDto(await this.prisma.brand.update({ where: { id }, data: { ...dto, slug }, include }));
  }

  /** Los productos de la marca quedan "sin marca" (onDelete: SetNull). */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.brand.delete({ where: { id } });
  }

  private buildSlug(name: string, excludeId?: string) {
    return uniqueSlug(name, async (slug) =>
      Boolean(await this.prisma.brand.count({ where: { slug, id: excludeId ? { not: excludeId } : undefined } })),
    );
  }
}
