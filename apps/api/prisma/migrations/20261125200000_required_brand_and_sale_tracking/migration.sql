-- Product.brandId pasa a ser obligatorio: los productos sin marca se eliminan
-- (las ventas conservan su snapshot porque SaleItem.productId es SET NULL).
DELETE FROM "Product" WHERE "brandId" IS NULL;

ALTER TABLE "Product" DROP CONSTRAINT "Product_brandId_fkey";
ALTER TABLE "Product" ALTER COLUMN "brandId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

UPDATE "Sale" SET "paymentStatus" = 'PAID' WHERE "status" IN ('PAID', 'PREPARING', 'SHIPPED', 'DELIVERED');

-- CreateTable
CREATE TABLE "SaleStatusChange" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleStatusChange_saleId_createdAt_idx" ON "SaleStatusChange"("saleId", "createdAt");

-- AddForeignKey
ALTER TABLE "SaleStatusChange" ADD CONSTRAINT "SaleStatusChange_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleStatusChange" ADD CONSTRAINT "SaleStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Historial inicial de las ventas existentes: alta + estado actual (si avanzó).
INSERT INTO "SaleStatusChange" ("id", "saleId", "status", "changedById", "createdAt")
SELECT gen_random_uuid()::text, "id", 'PENDING', "createdById", "createdAt" FROM "Sale";

INSERT INTO "SaleStatusChange" ("id", "saleId", "status", "changedById", "createdAt")
SELECT gen_random_uuid()::text, "id", "status", "createdById", "updatedAt" FROM "Sale" WHERE "status" <> 'PENDING';
