import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { listQuerySchema, userCreateSchema, userUpdateSchema, type SessionUser } from '@panel/shared';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Usuarios administradores del panel' })
  findAll(@Query({ schema: listQuerySchema }) query: z.output<typeof listQuerySchema>) {
    return this.users.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un usuario administrador' })
  create(@Body({ schema: userCreateSchema }) dto: z.output<typeof userCreateSchema>) {
    return this.users.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body({ schema: userUpdateSchema }) dto: z.output<typeof userUpdateSchema>) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.users.remove(id, user.id);
  }
}
