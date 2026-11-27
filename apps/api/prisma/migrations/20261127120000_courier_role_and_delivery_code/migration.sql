-- Rol de viajante y confirmación de entrega con código.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COURIER');

-- AlterTable: los usuarios existentes siguen siendo administradores.
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "courierId" TEXT,
ADD COLUMN "deliveryCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deliveryCodeHash" TEXT;

-- CreateIndex
CREATE INDEX "Sale_courierId_status_idx" ON "Sale"("courierId", "status");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
