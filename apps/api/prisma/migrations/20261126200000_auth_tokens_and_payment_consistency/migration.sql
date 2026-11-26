-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coherencia venta/pago (antes el pago se editaba libremente):
-- una venta que ya avanzó de "Pendiente" está cobrada.
UPDATE "Sale" SET "paymentStatus" = 'PAID'
WHERE "status" IN ('PAID', 'PREPARING', 'SHIPPED', 'DELIVERED') AND "paymentStatus" <> 'PAID';

-- Una venta pendiente todavía no puede figurar cobrada ni reembolsada.
UPDATE "Sale" SET "paymentStatus" = 'PENDING'
WHERE "status" = 'PENDING' AND "paymentStatus" IN ('PAID', 'REFUNDED');

-- Una venta cancelada que figuraba cobrada se considera reembolsada.
UPDATE "Sale" SET "paymentStatus" = 'REFUNDED'
WHERE "status" = 'CANCELLED' AND "paymentStatus" = 'PAID';
