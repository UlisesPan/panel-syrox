import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { setupApp, setupSwagger } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  setupSwagger(app);

  const port = app.get(ConfigService<Env, true>).get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API lista en http://localhost:${port}/api — Docs en /api/docs`, 'Bootstrap');
}

await bootstrap();
