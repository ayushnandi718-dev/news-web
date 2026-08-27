/*
  Warnings:

  - You are about to drop the column `endsAt` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `linkUrl` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Advertisement` table. All the data in the column will be lost.
  - Added the required column `internalName` to the `Advertisement` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Advertisement_placement_isActive_idx";

-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "endsAt",
DROP COLUMN "isActive",
DROP COLUMN "linkUrl",
DROP COLUMN "sortOrder",
DROP COLUMN "startsAt",
ADD COLUMN     "advertiserName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "destinationUrl" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "internalName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "size" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'TOP_BANNER',
ALTER COLUMN "title" SET DEFAULT '',
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AdvertisementRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TOP_BANNER',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertisementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertisementPricing" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertisementPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdvertisementRequest_status_createdAt_idx" ON "AdvertisementRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdvertisementPricing_type_placement_size_key" ON "AdvertisementPricing"("type", "placement", "size");

-- CreateIndex
CREATE INDEX "Advertisement_status_placement_idx" ON "Advertisement"("status", "placement");

-- CreateIndex
CREATE INDEX "Advertisement_placement_priority_idx" ON "Advertisement"("placement", "priority");

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AdvertisementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
