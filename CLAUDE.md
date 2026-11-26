# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Panel de administración genérico (white-label) para e-commerce. Monorepo pnpm + Turborepo: `apps/api` (NestJS 12 + Prisma 7 + PostgreSQL), `apps/web` (Next.js 16 App Router + React 19 + Tailwind 4 + shadcn/ui + TanStack Query) y `packages/shared` (schemas Zod 4, tipos y utilidades). Node 24+ (`.nvmrc`). Código, comentarios, mensajes de error y UI están en español rioplatense; mantenerlo así.

## Comandos

```bash
pnpm dev                     # shared (watch) + API :4000 + web :3000
pnpm build | lint | typecheck | test    # todo el monorepo vía turbo
pnpm --filter @panel/shared build       # OBLIGATORIO antes de compilar/typecheckear api o web por separado
pnpm --filter api test                  # vitest (unit: *.spec.ts junto al código)
pnpm --filter api test:e2e              # vitest con vitest.config.e2e.ts (test/)
pnpm --filter @panel/shared test
pnpm --filter api exec vitest run src/common/http/pagination.spec.ts   # un solo archivo
pnpm --filter api exec vitest run -t "nombre del test"                 # un solo test

pnpm db:up                   # Postgres en Docker (docker-compose.yml)
pnpm db:migrate              # prisma migrate dev (desarrollo)
pnpm --filter api db:deploy  # prisma migrate deploy (producción)
pnpm db:seed                 # BORRA TODO y recrea datos demo (admin@panel.com / Admin123!)
```

Lint: la API usa `oxlint --type-aware`, la web usa ESLint (config de Next).

## Arquitectura

### `@panel/shared` es la fuente de verdad
`apps/*` consumen `@panel/shared` desde su `dist/` (no desde `src/`), por eso hay que buildearlo antes. Los schemas Zod se usan en ambos lados: la API valida con `@Body({ schema })` / `@Query({ schema })` (Standard Schema nativo de Nest 12, pipe global en `common/pipes/validation.ts`) y el front con `zodResolver` en react-hook-form. Una regla de validación nueva va en el schema compartido, no duplicada. Los tipos de respuesta (`Product`, `SaleDetail`, `Paginated<T>`, `ApiErrorBody`…) también viven ahí. Exportar todo módulo nuevo desde `packages/shared/src/index.ts`.

### API (NestJS, ESM)
- Un módulo por dominio (`auth`, `users`, `categories`, `brands`, `products`, `sales`, `customers`, `dashboard`, `mail`), registrado en `app.module.ts`. Imports relativos terminan en `.js`; tests con Vitest (`vi.fn()`).
- Prefijo global `/api`; Swagger en `/api/docs`; healthcheck `/api/health` (lo usa Render).
- Auth: JWT en cookie httpOnly `panel_session`. El guard es global: los endpoints son privados salvo `@Public()`. `@CurrentUser()` da el `SessionUser`. El guard **lee el usuario de la base en cada request** y compara `payload.ver` con `User.tokenVersion`: cambiar o restablecer la contraseña incrementa la versión y cierra las demás sesiones; borrar un usuario invalida sus tokens. `logout` es público a propósito (borra cookies inválidas; el cliente lo llama ante un 401 para evitar loops con `proxy.ts`).
- Recuperación de contraseña: token aleatorio, en la base solo su SHA-256, vence a los 30 min y es de un solo uso. `forgot-password` responde siempre 204 y manda el mail en segundo plano (no revela si el email existe). Mails con la API HTTP de Brevo (`mail/mail.service.ts`; el plan free de Render bloquea SMTP); sin `BREVO_API_KEY` el link se escribe en el log.
- Listados: todos aceptan `listQuerySchema` (page, pageSize, search, sortBy, sortOrder) y devuelven `Paginated<T>`. El orden se resuelve con `resolveOrderBy` contra una **lista blanca** por recurso (`common/http/pagination.ts`).
- Errores: `AllExceptionsFilter` normaliza todo a `{ statusCode, message, errors?: [{ path, message }] }`. Para marcar un campo puntual del formulario, lanzar una `HttpException` con `errors` (ver `auth.service.ts#changePassword`).
- Cliente Prisma generado en `apps/api/src/generated/prisma` (gitignored; lo genera `postinstall`/`build`). Importar desde `../generated/prisma/client.js`. `prisma.config.ts` exige `DATABASE_URL` incluso para `prisma generate`.
- Variables de entorno validadas al arrancar en `config/env.ts`.

### Reglas de dominio que no son obvias
- **Ventas**: los precios se calculan siempre en el servidor dentro de una transacción; cada `SaleItem` guarda un snapshot (nombre, variante, precio), por eso `productId`/`variantId` son `SET NULL`. Las ventas no se borran: se cancelan. Cada cambio de estado crea un `SaleStatusChange` (historial con nota y usuario).
- **Máquina de estados de venta/pago** (`packages/shared/src/schemas/sale.ts`, la usan API y panel): `SALE_TRANSITIONS` permite avanzar un paso por vez (Pendiente → Pagada → En preparación → Enviada → Entregada) y cancelar solo antes del envío. El pago no se edita libremente: `paymentStatusAfter` lo pasa a `PAID` al marcar "Pagada" y a `REFUNDED` al cancelar una venta cobrada; a mano solo se alterna `PENDING`/`FAILED` mientras la venta está pendiente. Ingresos (dashboard) y "total gastado" (clientes) cuentan solo `paymentStatus = PAID`.
- **Fuera de alcance por consigna**: stock y pasarela de pagos. No agregarlos.
- **Productos**: `brandId` es obligatorio y borrar una marca borra sus productos (`onDelete: Cascade`). Categoría es opcional (`SET NULL`). Las variantes son el producto cartesiano de las opciones (`packages/shared/src/utils/variants.ts`) y al editar se sincronizan por SKU para conservar ids referenciados por ventas.
- **Categorías**: jerárquicas, con prevención de ciclos; no se puede borrar una con subcategorías.
- **Clientes**: no hay tabla; `CustomersService` agrupa ventas por email (o nombre) con SQL crudo vía `Prisma.sql` (el `ORDER BY` sale de la lista blanca).
- Dinero: `Decimal(12,2)` en DB; convertir con `toMoney` (`common/utils/decimal.ts`) al armar DTOs.

### Web (Next.js 16 — tiene breaking changes, ver `apps/web/AGENTS.md`)
- Next reescribe `/api/*` hacia `API_URL` (`next.config.ts`): el navegador habla con un solo origen y la cookie es first-party. El front nunca llama a la API por otro dominio.
- `src/proxy.ts` (el "middleware" en Next 16) solo hace el chequeo optimista de cookie; la validación real es de la API (401 → el cliente redirige al login).
- Patrón CRUD: `lib/resource.ts#defineResource` declara endpoint, query keys, textos e invalidaciones → `hooks/use-resource.ts` (list/detail/mutations con toasts) → `components/crud/crud-page.tsx` arma la página completa. Categorías y Marcas son la misma `CrudPage`; Productos y Ventas usan las mismas piezas (`DataTable`, `PageHeader`, `RowActions`, `components/form/*`) con páginas propias.
- Estado de listados (página, búsqueda, orden, filtros, modal abierto) vive en la URL vía `hooks/use-list-params.ts`.
- Errores de API a formularios: `handleFormError` (`lib/form-errors.ts`) mapea `errors[].path` al campo.
- Labels y colores de enums en `lib/labels.ts`; formato de moneda/fecha en `lib/format.ts` (usa el locale/moneda white-label).
- Sidebar, breadcrumbs y paleta de comandos salen de `config/navigation.ts`: una sección nueva = entrada ahí + carpeta en `app/(panel)/`.
- White-label por env (`config/site.ts`): `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_STORE_LOGO` (ej. `/brand/logo.png` en `public/`), `NEXT_PUBLIC_BRAND_COLOR` (genera la utilidad `bg-brand`/`text-brand`), `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE`. Son de build: cambiarlas requiere redeploy.

## Base de datos y migraciones
- Cambios de schema → `prisma/schema.prisma` + migración en `prisma/migrations/`. Si la migración toca datos existentes (backfill, borrados), escribir el SQL a mano en la migración.
- `prisma/seed.ts` es solo para demo/desarrollo: empieza con `deleteMany()` de todas las tablas. Nunca correrlo contra producción con datos reales ni agregarlo a un build.

## Deploy
- API en Render (`render.yaml`, plan free; el servicio se creó a mano, así que las variables nuevas se cargan en el dashboard): el build command corre `prisma migrate deploy` al final porque el plan free no tiene pre-deploy command. Cada push a `main` migra la base de producción. Variables de mail: `APP_URL`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL` (remitente verificado en Brevo), `MAIL_FROM_NAME`.
- Web en Vercel: Root Directory `apps/web`; el install usa `pnpm install --filter web... --filter @panel/shared` para no correr el `postinstall` de la API (que exige `DATABASE_URL`) y el build compila `@panel/shared` antes de `web`.
- DB en Neon (usar el connection string con `-pooler`).
