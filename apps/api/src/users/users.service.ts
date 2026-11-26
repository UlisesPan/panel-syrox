import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { userCreateSchema, userUpdateSchema, type ListQuery, type Paginated, type User } from '@panel/shared';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { containsInsensitive, paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';

type CreateDto = z.output<typeof userCreateSchema>;
type UpdateDto = z.output<typeof userUpdateSchema>;

const select = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  _count: { select: { sales: true } },
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof select }>;

const toDto = (u: UserRow): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  salesCount: u._count.sales,
  createdAt: u.createdAt.toISOString(),
});

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async findAll(query: ListQuery): Promise<Paginated<User>> {
    const where: Prisma.UserWhereInput = query.search
      ? { OR: [{ name: containsInsensitive(query.search) }, { email: containsInsensitive(query.search) }] }
      : {};
    const orderBy = resolveOrderBy<Prisma.UserOrderByWithRelationInput>(
      query,
      {
        name: (dir) => ({ name: dir }),
        email: (dir) => ({ email: dir }),
        createdAt: (dir) => ({ createdAt: dir }),
      },
      { createdAt: 'asc' },
    );
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy, select, ...paginationArgs(query) }),
      this.prisma.user.count({ where }),
    ]);
    return toPaginated(items.map(toDto), total, query);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id }, select });
    if (!user) throw new NotFoundException('El usuario no existe.');
    return toDto(user);
  }

  async create({ password, ...data }: CreateDto): Promise<User> {
    await this.auth.assertEmailAvailable(data.email);
    const user = await this.prisma.user.create({
      data: { ...data, passwordHash: await AuthService.hashPassword(password) },
      select,
    });
    return toDto(user);
  }

  async update(id: string, data: UpdateDto): Promise<User> {
    await this.findOne(id);
    await this.auth.assertEmailAvailable(data.email, id);
    return toDto(await this.prisma.user.update({ where: { id }, data, select }));
  }

  /** Sus ventas e historial quedan sin autor (SET NULL); sus sesiones dejan de valer al no existir el usuario. */
  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) throw new BadRequestException('No podés eliminar tu propio usuario.');
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
