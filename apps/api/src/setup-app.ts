import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { createValidationPipe } from './common/pipes/validation.js';
import { SESSION_COOKIE } from './auth/auth.constants.js';

/**
 * Configuración HTTP compartida entre `main.ts` y los tests e2e,
 * así los tests corren contra la misma app que producción.
 */
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }).split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Panel Admin API')
      .setDescription('API REST del panel administrativo genérico para e-commerce.')
      .setVersion('1.0')
      .addCookieAuth(SESSION_COOKIE)
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, withCredentials: true },
  });
}
