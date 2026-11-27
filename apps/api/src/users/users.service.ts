import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  userCreateSchema,
  userFiltersSchema,
  userUpdateSchema,
  type ListQuery,
  type Paginated,
  type User,
} from '@panel/shared';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { fieldError } from '../common/http/field-error.js';
import { containsInsensitive, paginationArgs, resolveOrderBy, toPaginated } from '../common/http/pagination.js';

type CreateDto = z.output<typeof userCreateSchema>;
type UpdateDto = z.output<typeof userUpdateSchema>;
type UserListQuery = ListQuery & z.output<typeof userFiltersSchema>;

const select = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  _count: { select: { sales: true, deliveries: { where: { status: 'SHIPPED' } } } },
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof select }>;

const toDto = (u: UserRow): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  salesCount: u._count.sales,
  pendingDeliveries: u._count.deliveries,
  createdAt: u.createdAt.toISOString(),
});

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async findAll(query: UserListQuery): Promise<Paginated<User>> {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      ...(query.search && {
        OR: [{ name: containsInsensitive(query.search) }, { email: containsInsensitive(query.search) }],
      }),
    };
    const orderBy = resolveOrderBy<Prisma.UserOrderByWithRelationInput>(
      query,
      {
        name: (dir) => ({ name: dir }),
        email: (dir) => ({ email: dir }),
        role: (dir) => ({ role: dir }),
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

  async update(id: string, data: UpdateDto, currentUserId: string): Promise<User> {
    const user = await this.findOne(id);
    // Evita que el último admin conectado se quite el acceso a sí mismo.
    if (id === currentUserId && user.role === 'ADMIN' && data.role !== 'ADMIN') {
      throw new BadRequestException(fieldError('role', 'No podés quitarte el rol de administrador.'));
    }
    await this.auth.assertEmailAvailable(data.email, id);
    return toDto(await this.prisma.user.update({ where: { id }, data, select }));
  }

  /**
   * Sus ventas e historial quedan sin autor y sus envíos sin viajante (SET NULL);
   * sus sesiones dejan de valer al no existir el usuario.
   */
  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) throw new BadRequestException('No podés eliminar tu propio usuario.');
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
