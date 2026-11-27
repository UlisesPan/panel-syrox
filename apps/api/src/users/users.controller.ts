import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  userCreateSchema,
  userFiltersSchema,
  userUpdateSchema,
  type SessionUser,
} from '@panel/shared';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';

const userListQuerySchema = listQuerySchema.extend(userFiltersSchema.shape);

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Usuarios del panel (administradores y viajantes)' })
  findAll(@Query({ schema: userListQuerySchema }) query: z.output<typeof userListQuerySchema>) {
    return this.users.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un usuario (administrador o viajante)' })
  create(@Body({ schema: userCreateSchema }) dto: z.output<typeof userCreateSchema>) {
    return this.users.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body({ schema: userUpdateSchema }) dto: z.output<typeof userUpdateSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.users.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.users.remove(id, user.id);
  }
}
