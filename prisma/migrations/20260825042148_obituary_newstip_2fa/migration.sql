-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "Obituary" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "photoUrl" TEXT,
    "message" TEXT NOT NULL,
    "deathDate" TIMESTAMP(3),
    "submittedName" TEXT,
    "submittedPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obituary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsTip" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsTip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Obituary_slug_key" ON "Obituary"("slug");

-- CreateIndex
CREATE INDEX "Obituary_status_createdAt_idx" ON "Obituary"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Obituary_publishedAt_idx" ON "Obituary"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsTip_status_createdAt_idx" ON "NewsTip"("status", "createdAt");
