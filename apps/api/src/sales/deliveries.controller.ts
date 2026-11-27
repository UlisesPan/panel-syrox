import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { deliveryConfirmSchema, type SessionUser } from '@panel/shared';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/auth.constants.js';
import { SalesService } from './sales.service.js';

const deliveriesQuerySchema = z.object({ status: z.enum(['SHIPPED', 'DELIVERED']).default('SHIPPED') });

/** "Mis entregas": lo único que ve un viajante. Cada uno accede solo a los envíos que tiene asignados. */
@ApiTags('Entregas (viajante)')
@Roles('COURIER')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Envíos asignados al viajante: pendientes (SHIPPED) o entregados (DELIVERED)' })
  findAll(
    @Query({ schema: deliveriesQuerySchema }) query: z.output<typeof deliveriesQuerySchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.sales.findDeliveries(user.id, query.status);
  }

  @Post(':id/confirm')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirma la entrega (con el código que recibió el cliente, si tiene)' })
  confirm(
    @Param('id') id: string,
    @Body({ schema: deliveryConfirmSchema }) dto: z.output<typeof deliveryConfirmSchema>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.sales.confirmDelivery(id, dto, user);
  }
}
