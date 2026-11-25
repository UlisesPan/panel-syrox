import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody } from '@panel/shared';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Normaliza TODOS los errores a la forma `ApiErrorBody`.
 * El frontend tiene un solo lugar donde interpretar errores, y nunca se filtran
 * detalles internos (stack traces, SQL) al cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') return { statusCode: status, message: res };
      const { message, errors } = res as { message?: string | string[]; errors?: ApiErrorBody['errors'] };
      return {
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : (message ?? exception.message),
        ...(errors && { errors }),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { statusCode: HttpStatus.CONFLICT, message: 'Ya existe un registro con esos datos (valor duplicado).' };
        case 'P2003':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'La operación referencia un registro inexistente o en uso.',
          };
        case 'P2025':
          return { statusCode: HttpStatus.NOT_FOUND, message: 'El registro no existe.' };
      }
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error interno del servidor.' };
  }
}
