import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { listQuerySchema } from '@panel/shared';
import type { z } from 'zod';
import { CustomersService } from './customers.service.js';

@ApiTags('Clientes')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Clientes agrupados a partir de las ventas, con búsqueda, orden y paginación' })
  findAll(@Query({ schema: listQuerySchema }) query: z.output<typeof listQuerySchema>) {
    return this.customers.findAll(query);
  }
}
