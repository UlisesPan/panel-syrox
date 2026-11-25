import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Category, EntityRef, ListQuery, Paginated } from '@panel/shared';
import { categoryInputSchema, categoryUpdateSchema } from '@panel/shared';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { containsInsensitive, paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';
import { uniqueSlug } from '../common/utils/unique-slug.js';

type CreateDto = z.output<typeof categoryInputSchema>;
type UpdateDto = z.output<typeof categoryUpdateSchema>;

const include = {
  parent: { select: { id: true, name: true } },
  _count: { select: { children: true, products: true } },
} satisfies Prisma.CategoryInclude;

type CategoryWithRelations = Prisma.CategoryGetPayload<{ include: typeof include }>;

const toDto = (c: CategoryWithRelations): Category => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  position: c.position,
  parentId: c.parentId,
  parent: c.parent,
  childrenCount: c._count.children,
  productsCount: c._count.products,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQuery): Promise<Paginated<Category>> {
    const where: Prisma.CategoryWhereInput = { name: containsInsensitive(query.search) };
    const orderBy = resolveOrderBy<Prisma.CategoryOrderByWithRelationInput[]>(
      query,
      {
        name: (dir) => [{ name: dir }],
        position: (dir) => [{ position: dir }, { name: 'asc' }],
        childrenCount: (dir) => [{ children: { _count: dir } }],
        parent: (dir) => [{ parent: { name: dir } }, { position: 'asc' }],
        createdAt: (dir) => [{ createdAt: dir }],
      },
      // Orden por defecto: árbol "aplanado" → principales primero y luego por posición.
      [{ parentId: { sort: 'asc', nulls: 'first' } }, { position: 'asc' }, { name: 'asc' }],
    );

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({ where, orderBy, include, ...paginationArgs(query) }),
      this.prisma.category.count({ where }),
    ]);
    return toPaginated(items.map(toDto), total, query);
  }

  /** Lista liviana para selects (ej: "Categoría padre", filtro de productos). */
  async options(): Promise<Array<EntityRef & { parentId: string | null }>> {
    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true, parentId: true, parent: { select: { name: true } } },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
    return categories.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      name: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
    }));
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id }, include });
    if (!category) throw new NotFoundException('La categoría no existe.');
    return toDto(category);
  }

  async create(dto: CreateDto): Promise<Category> {
    if (dto.parentId) await this.assertExists(dto.parentId);
    const slug = await this.buildSlug(dto.name, dto.parentId);
    const category = await this.prisma.category.create({ data: { ...dto, slug }, include });
    return toDto(category);
  }

  async update(id: string, dto: UpdateDto): Promise<Category> {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('La categoría no existe.');

    if (dto.parentId) await this.assertValidParent(id, dto.parentId);

    const nameOrParentChanged =
      (dto.name !== undefined && dto.name !== current.name) ||
      (dto.parentId !== undefined && dto.parentId !== current.parentId);
    const slug = nameOrParentChanged
      ? await this.buildSlug(dto.name ?? current.name, dto.parentId !== undefined ? dto.parentId : current.parentId, id)
      : undefined;

    const category = await this.prisma.category.update({ where: { id }, data: { ...dto, slug }, include });
    return toDto(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id }, include });
    if (!category) throw new NotFoundException('La categoría no existe.');
    if (category._count.children > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${category._count.children} subcategoría(s). Eliminalas o movelas primero.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.category.count({ where: { id } });
    if (!exists) throw new BadRequestException('La categoría padre no existe.');
  }

  /** Evita ciclos: una categoría no puede ser padre de sí misma ni de un ancestro suyo. */
  private async assertValidParent(id: string, parentId: string) {
    if (id === parentId) throw new BadRequestException('Una categoría no puede ser su propia categoría padre.');
    let cursor: string | null = parentId;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      const node: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      if (!node) throw new BadRequestException('La categoría padre no existe.');
      if (node.parentId === id) {
        throw new BadRequestException('No se puede mover una categoría dentro de una de sus subcategorías.');
      }
      cursor = node.parentId;
    }
  }

  /** "Running" dentro de "Hombre" → "hombre-running" (y único). */
  private async buildSlug(name: string, parentId: string | null, excludeId?: string) {
    const parent = parentId
      ? await this.prisma.category.findUnique({ where: { id: parentId }, select: { slug: true } })
      : null;
    const base = parent ? `${parent.slug} ${name}` : name;
    return uniqueSlug(base, async (slug) =>
      Boolean(await this.prisma.category.count({ where: { slug, id: excludeId ? { not: excludeId } : undefined } })),
    );
  }
}
