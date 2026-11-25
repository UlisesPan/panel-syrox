/**
 * Seed de desarrollo/demo: usuario admin + catálogo + ventas de los últimos 30 días.
 * Es idempotente (limpia y vuelve a crear) y determinístico (PRNG con semilla fija).
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { slugify, variantLabel, buildVariantCombinations, suggestVariantSku } from '@panel/shared';
import { Prisma, PrismaClient, type PaymentMethod, type SaleStatus } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// PRNG determinístico (mulberry32) → el seed genera siempre los mismos datos.
let state = 20251127;
const random = () => {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;

const CATEGORY_TREE: Record<string, string[]> = {
  Hombre: ['Basketball', 'Botas', 'Running', 'Casual', 'Industrial', 'Sport', 'Soccer'],
  Mujer: ['Vestir', 'Running', 'Casual', 'Sport'],
  Niño: ['Escolar', 'Deportivo'],
};

const BRANDS = ['Adidas', 'Nike', 'Puma', 'New Balance', 'Coqueta', 'Quirelli', 'Jeep', 'Audaz'];

type SeedProduct = {
  name: string;
  brand: string;
  category: [string, string];
  price: number;
  sizes?: string[];
  colors?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
};

const PRODUCTS: SeedProduct[] = [
  { name: 'Tenis Adidas VL Court Base', brand: 'Adidas', category: ['Niño', 'Deportivo'], price: 1299, sizes: ['22', '23', '24', '25'], colors: ['Blanco', 'Negro'] },
  { name: 'Zapatillas Adidas Grand Court Lifestyle', brand: 'Adidas', category: ['Niño', 'Deportivo'], price: 1199, sizes: ['22', '23', '24'] },
  { name: 'Adidas Tensaur GW6456', brand: 'Adidas', category: ['Niño', 'Escolar'], price: 899 },
  { name: 'Adidas VL Court 3.0', brand: 'Adidas', category: ['Hombre', 'Casual'], price: 1499, sizes: ['26', '27', '28', '29'], colors: ['Blanco', 'Azul'] },
  { name: 'Bota Escolar Audaz Juvenil Clásica', brand: 'Audaz', category: ['Niño', 'Escolar'], price: 749, sizes: ['22', '23', '24', '25'] },
  { name: 'Bota Escolar Audaz Niño Agujeta', brand: 'Audaz', category: ['Niño', 'Escolar'], price: 699 },
  { name: 'Zapatillas Adidas Tensaur Run 3.0', brand: 'Adidas', category: ['Niño', 'Deportivo'], price: 999 },
  { name: 'Botas Jeep 3561 Caballero', brand: 'Jeep', category: ['Hombre', 'Botas'], price: 1899, sizes: ['26', '27', '28', '29', '30'] },
  { name: 'Nike Court Borough Low Recraft', brand: 'Nike', category: ['Niño', 'Deportivo'], price: 1399 },
  { name: 'Nike Air Max SC', brand: 'Nike', category: ['Hombre', 'Running'], price: 2199, sizes: ['26', '27', '28', '29'], colors: ['Negro', 'Gris'] },
  { name: 'Nike Revolution 7', brand: 'Nike', category: ['Mujer', 'Running'], price: 1599, sizes: ['23', '24', '25', '26'] },
  { name: 'Nike Precision 6 Basketball', brand: 'Nike', category: ['Hombre', 'Basketball'], price: 1999 },
  { name: 'Puma Smash 3.0', brand: 'Puma', category: ['Hombre', 'Casual'], price: 1099 },
  { name: 'Puma Future Play Soccer', brand: 'Puma', category: ['Hombre', 'Soccer'], price: 1299, sizes: ['26', '27', '28'] },
  { name: 'Puma Carina 2.0', brand: 'Puma', category: ['Mujer', 'Casual'], price: 1249, colors: ['Blanco', 'Rosa'] },
  { name: 'New Balance 574 Core', brand: 'New Balance', category: ['Hombre', 'Sport'], price: 2499 },
  { name: 'New Balance Fresh Foam Arishi', brand: 'New Balance', category: ['Mujer', 'Running'], price: 1899 },
  { name: 'Coqueta Zapato Escolar Charol', brand: 'Coqueta', category: ['Niño', 'Escolar'], price: 649, sizes: ['18', '19', '20', '21'] },
  { name: 'Quirelli 88404 Casual Urbano', brand: 'Quirelli', category: ['Hombre', 'Casual'], price: 1349, colors: ['Negro', 'Café'] },
  { name: 'Quirelli 88602 Vestir', brand: 'Quirelli', category: ['Hombre', 'Casual'], price: 1449 },
  { name: 'Quirelli Mocasín Dama', brand: 'Quirelli', category: ['Mujer', 'Vestir'], price: 1199 },
  { name: 'Jeep Bota Industrial Casquillo', brand: 'Jeep', category: ['Hombre', 'Industrial'], price: 2299 },
  { name: 'Adidas Ultraboost Light', brand: 'Adidas', category: ['Mujer', 'Sport'], price: 3299, status: 'DRAFT' },
  { name: 'Nike Phantom GX Academy', brand: 'Nike', category: ['Hombre', 'Soccer'], price: 2599, status: 'ARCHIVED' },
];

const CUSTOMERS = [
  'Jaime González Correa', 'Santiago Pérez Baglivo', 'María Fernanda López', 'Lucía Martínez', 'Diego Ramírez',
  'Valentina Torres', 'Martín Herrera', 'Camila Rodríguez', 'Joaquín Fernández', 'Sofía Castro',
];
const STATUS_WEIGHTS: SaleStatus[] = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'SHIPPED', 'PREPARING', 'PAID', 'PENDING', 'CANCELLED'];
const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'CREDIT_CARD', 'TRANSFER'];

async function main() {
  console.log('🧹 Limpiando datos…');
  await prisma.$transaction([
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productOption.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany({ where: { parentId: { not: null } } }),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('👤 Usuario admin');
  const admin = await prisma.user.create({
    data: {
      email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@panel.com').toLowerCase(),
      name: 'Administrador',
      passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!', 10),
    },
  });

  console.log('🗂️  Categorías');
  const categoryIds = new Map<string, string>();
  let rootPosition = 0;
  for (const [rootName, children] of Object.entries(CATEGORY_TREE)) {
    const root = await prisma.category.create({
      data: { name: rootName, slug: slugify(rootName), position: rootPosition++ },
    });
    categoryIds.set(rootName, root.id);
    for (const [position, child] of children.entries()) {
      const created = await prisma.category.create({
        data: { name: child, slug: slugify(`${rootName} ${child}`), position, parentId: root.id },
      });
      categoryIds.set(`${rootName}/${child}`, created.id);
    }
  }

  console.log('🏷️  Marcas');
  const brandIds = new Map<string, string>();
  for (const name of BRANDS) {
    const brand = await prisma.brand.create({ data: { name, slug: slugify(name) } });
    brandIds.set(name, brand.id);
  }

  console.log('👟 Productos');
  const products = [];
  for (const [index, p] of PRODUCTS.entries()) {
    const sku = `${slugify(p.brand).slice(0, 3).toUpperCase()}-${String(index + 1).padStart(4, '0')}`;
    const options = [
      ...(p.colors ? [{ name: 'Color', values: p.colors }] : []),
      ...(p.sizes ? [{ name: 'Talla', values: p.sizes }] : []),
    ];
    const variants = buildVariantCombinations(options).map((combo) => ({
      sku: suggestVariantSku(sku, combo),
      options: combo,
      price: null,
    }));
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        sku,
        description: `${p.name}. Calzado ${p.category[1].toLowerCase()} de la línea ${p.category[0].toLowerCase()} de ${p.brand}.`,
        price: p.price,
        status: p.status ?? 'ACTIVE',
        brandId: brandIds.get(p.brand)!,
        categoryId: categoryIds.get(p.category.join('/'))!,
        options: { create: options.map((o, position) => ({ ...o, position })) },
        variants: { create: variants },
      },
      include: { variants: true },
    });
    products.push(product);
  }

  console.log('🧾 Ventas');
  const sellable = products.filter((p) => p.status === 'ACTIVE');
  for (let i = 0; i < 60; i++) {
    const createdAt = new Date(Date.now() - between(0, 29) * 86_400_000 - between(0, 86_399) * 1000);
    const items = Array.from({ length: between(1, 3) }, () => {
      const product = pick(sellable);
      const variant = product.variants.length ? pick(product.variants) : null;
      const unitPrice = variant?.price ?? product.price;
      const quantity = between(1, 3);
      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        variantLabel: variant ? variantLabel(variant.options as Record<string, string>) : null,
        unitPrice,
        quantity,
        subtotal: unitPrice.mul(quantity),
      };
    });
    const customerName = pick(CUSTOMERS);
    await prisma.sale.create({
      data: {
        customerName,
        customerEmail: `${slugify(customerName).replace(/-/g, '.')}@mail.com`,
        status: pick(STATUS_WEIGHTS),
        paymentMethod: pick(PAYMENT_METHODS),
        total: items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0)),
        createdById: admin.id,
        createdAt,
        items: { create: items },
      },
    });
  }

  console.log(`✅ Listo. Ingresá con ${admin.email} / ${process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
