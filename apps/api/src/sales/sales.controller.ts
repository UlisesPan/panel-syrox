import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  saleFiltersSchema,
  saleInputSchema,
  salePaymentUpdateSchema,
  saleStatusUpdateSchema,
  type SessionUser,
} from '@panel/shared';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SalesService } from './sales.service.js';

const saleListQuerySchema = listQuerySchema.extend(saleFiltersSchema.shape);

/**
 * Las ventas no se eliminan (son registros contables): se cancelan cambiando su estado.
 */
@ApiTags('Ventas')
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado de ventas' })
  findAll(@Query({ schema: saleListQuerySchema }) query: z.output<typeof saleListQuerySchema>) {
    return this.sales.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de la venta con sus ítems' })
  findOne(@Param('id') id: string) {
    return this.sales.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Generar venta' })
  create(@Body({ schema: saleInputSchema }) dto: z.output<typeof saleInputSchema>, @CurrentUser() user: SessionUser) {
    return this.sales.create(dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado de la venta (queda registrado en el historial)' })
  updateStatus(
    @Param('id') id: string,
    @Body({ schema: saleStatusUpdateSchema }) dto: z.output<typeof saleStatusUpdateSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.sales.updateStatus(id, dto, user);
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Cambiar el estado del pago' })
  updatePayment(
    @Param('id') id: string,
    @Body({ schema: salePaymentUpdateSchema }) dto: z.output<typeof salePaymentUpdateSchema>,
  ) {
    return this.sales.updatePaymentStatus(id, dto.paymentStatus);
  }
}
