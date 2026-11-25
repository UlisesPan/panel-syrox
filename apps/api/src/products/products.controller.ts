import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { listQuerySchema, productFiltersSchema, productInputSchema } from '@panel/shared';
import { z } from 'zod';
import { ProductsService } from './products.service.js';

const productListQuerySchema = listQuerySchema.extend(productFiltersSchema.shape);
const saleOptionsQuerySchema = z.object({ search: z.string().trim().max(100).optional() });

@ApiTags('Productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con búsqueda, filtros y orden' })
  findAll(@Query({ schema: productListQuerySchema }) query: z.output<typeof productListQuerySchema>) {
    return this.products.findAll(query);
  }

  @Get('sale-options')
  @ApiOperation({ summary: 'Productos activos con variantes y precio final, para generar ventas' })
  saleOptions(@Query({ schema: saleOptionsQuerySchema }) query: z.output<typeof saleOptionsQuerySchema>) {
    return this.products.saleOptions(query.search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post()
  create(@Body({ schema: productInputSchema }) dto: z.output<typeof productInputSchema>) {
    return this.products.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body({ schema: productInputSchema }) dto: z.output<typeof productInputSchema>) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
