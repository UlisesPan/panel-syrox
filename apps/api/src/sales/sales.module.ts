import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller.js';
import { DeliveriesController } from './deliveries.controller.js';
import { SalesService } from './sales.service.js';

@Module({
  controllers: [SalesController, DeliveriesController],
  providers: [SalesService],
})
export class SalesModule {}
