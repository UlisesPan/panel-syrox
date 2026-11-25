import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { categoryInputSchema, categoryUpdateSchema, listQuerySchema } from '@panel/shared';
import type { z } from 'zod';
import { CategoriesService } from './categories.service.js';

@ApiTags('Categorías')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con búsqueda y orden' })
  findAll(@Query({ schema: listQuerySchema }) query: z.output<typeof listQuerySchema>) {
    return this.categories.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Todas las categorías (id + nombre) para selects' })
  options() {
    return this.categories.options();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id);
  }

  @Post()
  create(@Body({ schema: categoryInputSchema }) dto: z.output<typeof categoryInputSchema>) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body({ schema: categoryUpdateSchema }) dto: z.output<typeof categoryUpdateSchema>) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
