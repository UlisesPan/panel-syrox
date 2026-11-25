import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { brandInputSchema, brandUpdateSchema, listQuerySchema } from '@panel/shared';
import type { z } from 'zod';
import { BrandsService } from './brands.service.js';

@ApiTags('Marcas')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con búsqueda y orden' })
  findAll(@Query({ schema: listQuerySchema }) query: z.output<typeof listQuerySchema>) {
    return this.brands.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Todas las marcas (id + nombre) para selects' })
  options() {
    return this.brands.options();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brands.findOne(id);
  }

  @Post()
  create(@Body({ schema: brandInputSchema }) dto: z.output<typeof brandInputSchema>) {
    return this.brands.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body({ schema: brandUpdateSchema }) dto: z.output<typeof brandUpdateSchema>) {
    return this.brands.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.brands.remove(id);
  }
}
