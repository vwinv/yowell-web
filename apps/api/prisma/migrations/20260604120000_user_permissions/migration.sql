-- CreateEnum
CREATE TYPE "AppModulePermission" AS ENUM ('COMPTABILITE', 'STOCK', 'COURSE', 'VENTE_CLIENTS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "permissions" "AppModulePermission"[] NOT NULL DEFAULT ARRAY[]::"AppModulePermission"[];
