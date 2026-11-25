import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common';

/**
 * Validación global con los schemas Zod compartidos (`@Body({ schema })`, `@Query({ schema })`).
 * Devuelve errores por campo para que el formulario del front los muestre en el input correspondiente.
 */
export function createValidationPipe() {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new BadRequestException({
        message: 'Los datos enviados no son válidos.',
        errors: issues.map((issue) => ({
          path: (issue.path ?? []).map((p) => (typeof p === 'object' ? String(p.key) : String(p))).join('.'),
          message: issue.message,
        })),
      }),
  });
}
