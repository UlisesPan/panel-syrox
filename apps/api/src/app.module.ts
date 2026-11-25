import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { ProductsModule } from './products/products.module.js';
import { SalesModule } from './sales/sales.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límite general de 120 req/min por IP; el login tiene uno más estricto.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage: 'Demasiados intentos. Esperá un minuto y volvé a probar.',
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    SalesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
