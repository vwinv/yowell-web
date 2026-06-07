-- CreateEnum
CREATE TYPE "SaleDeliveryStatus" AS ENUM ('DELIVERED', 'NOT_DELIVERED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "deliveryStatus" "SaleDeliveryStatus" NOT NULL DEFAULT 'NOT_DELIVERED';

-- CreateIndex
CREATE INDEX "Sale_deliveryStatus_idx" ON "Sale"("deliveryStatus");
