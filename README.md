# Panel Admin · E-commerce

Panel de administración **genérico y reutilizable** para cualquier e-commerce: login, dashboard, categorías, marcas, productos (con opciones y variantes), ventas (con seguimiento de envío e historial), clientes y configuración.

**Stack:** NestJS 12 · Prisma 7 · PostgreSQL · Next.js 16 · React 19 · TailwindCSS 4 · shadcn/ui · TanStack Query · Zod 4 · Turborepo + pnpm.

---

## Inicio rápido

Requisitos: Node 24+, pnpm, y Docker (o un PostgreSQL propio).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env       # completá JWT_SECRET (32+ caracteres)
cp apps/web/.env.example apps/web/.env.local
pnpm db:up                                     # Postgres en Docker (omitir si usás uno propio)
pnpm --filter @panel/shared build
pnpm db:migrate && pnpm db:seed                # tablas + datos de demo
pnpm dev                                       # API :4000 · Web :3000
```

| | |
|---|---|
| Panel | http://localhost:3000 |
| Usuario demo | `admin@panel.com` / `Admin123!` |
| Swagger | http://localhost:4000/api/docs |
| Healthcheck | http://localhost:4000/api/health |

---

## Estructura

```
apps/
  api/        NestJS: un módulo por dominio (auth, categories, brands, products, sales, customers, dashboard)
  web/        Next.js App Router
packages/
  shared/     Schemas Zod + tipos + utilidades compartidas por api y web
```

### La pieza central: `@panel/shared`

Los schemas de Zod son la **única fuente de verdad** de las reglas de validación:

- La **API** los usa con `@Body({ schema })` (validación nativa de Nest 12 con Standard Schema), y Swagger los documenta solo.
- El **front** usa los mismos schemas en `react-hook-form` → mismos mensajes y mismas reglas en ambos lados, sin duplicar código.
- Utilidades de dominio (generación de variantes, SKUs, slugs) viven acá y tienen tests.

### Frontend: componentes reutilizables

| Pieza | Qué hace |
|---|---|
| `lib/resource.ts` → `defineResource()` | Define un recurso CRUD una sola vez: endpoint, claves de cache, textos. |
| `hooks/use-resource.ts` | `useResourceList`, `useResourceDetail`, `useResourceMutations`: queries + toasts + invalidación de cache. |
| `hooks/use-list-params.ts` | Paginación, búsqueda, orden y filtros **sincronizados con la URL** (links compartibles, "atrás" funciona). |
| `components/data-table/` | `DataTable<T>` genérica con orden, paginación del servidor, skeletons y estados vacíos. |
| `components/crud/crud-page.tsx` | Página CRUD completa (tabla + modal de alta/edición + confirmación de borrado) a partir de un recurso. |
| `components/form/` | `FormField`, `TextField`, `SelectField`, `TagInput`, etc. conectados a react-hook-form y accesibles. |

**Categorías y Marcas son la misma `CrudPage`** con distinta configuración. Agregar un CRUD nuevo es:
un `*.resource.ts`, las columnas y el formulario (ver `features/brands/brands-view.tsx`, ~90 líneas).

### White-label

Todo lo que cambia entre tiendas se configura por variables de entorno (`apps/web/.env.example`):
nombre, logo, color de marca, moneda y locale. El resto del panel es 100% genérico.

---

## Decisiones técnicas

- **Sesión con cookie httpOnly + JWT.** El token nunca es accesible desde JavaScript. "Mantener sesión iniciada" extiende la expiración (30 días vs. cookie de sesión de 8 h).
- **Next.js proxy-ea `/api/*` hacia Nest** (rewrite). El navegador habla con un solo origen: cookie first-party, sin CORS ni `SameSite=None`.
- **`proxy.ts`** hace el chequeo optimista de sesión (redirección al login); la validación real la hace la API en cada request.
- **Precios con `Decimal(12,2)`**, nunca `float`.
- **Ventas con snapshot:** cada ítem guarda nombre, variante y precio al momento de la venta. Si después cambia el precio o se elimina el producto, el histórico no se altera.
- **Los precios de una venta se calculan siempre en el servidor**, dentro de una transacción. El total del front es solo una previsualización.
- **Las ventas no se eliminan:** se cancelan. Entregadas y canceladas son estados finales. Cada cambio de estado queda en un historial (fecha, usuario y nota opcional).
- **Marca obligatoria:** todo producto pertenece a una marca; al eliminar una marca se eliminan sus productos (las ventas conservan su snapshot).
- **Clientes sin tabla propia:** se derivan de las ventas agrupando por email (o nombre), así no hay datos duplicados que mantener sincronizados.
- **Orden por lista blanca:** cada recurso declara por qué columnas se puede ordenar (`resolveOrderBy`).
- **Errores normalizados:** un filtro global devuelve siempre `{ statusCode, message, errors? }`. Los errores por campo se muestran en el input correspondiente.
- **Categorías jerárquicas** con prevención de ciclos y bloqueo de borrado si tienen subcategorías.
- **Variantes:** se generan automáticamente como producto cartesiano de las opciones; al editar se sincronizan por SKU para conservar los ids referenciados por ventas.
- **Fuera de alcance por consigna:** stock y pasarela de pagos. El medio de pago se registra solo como dato informativo.

### Seguridad

Contraseñas con bcrypt · comparación en tiempo constante aunque el usuario no exista · rate limit global y más estricto en el login · `helmet` · validación de variables de entorno al arrancar · protección contra open redirect en `?next=`.

---

## Extras

- Modo claro / oscuro / sistema
- Dashboard: ingresos, ventas, ticket promedio, gráfico de 30 días, más vendidos
- Paleta de comandos (`Ctrl/⌘ + K`)
- Filtros y búsqueda con debounce, todo reflejado en la URL
- "Gestionar venta": progreso del pedido, datos de cliente/pago/envío, tracking, historial y acciones según el estado
- Clientes: pedidos, total gastado y última compra, con acceso directo a sus ventas
- Configuración: cambio de contraseña y vista de la configuración white-label
- Responsive, skeletons de carga, estados vacíos y toasts
- Swagger generado a partir de los schemas Zod
- Seed determinístico con datos realistas

---

## Scripts

| Comando | |
|---|---|
| `pnpm dev` | Levanta shared (watch), API y web |
| `pnpm build` | Build de todo el monorepo |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Calidad |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Base de datos |
