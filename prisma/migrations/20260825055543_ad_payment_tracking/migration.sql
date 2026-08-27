-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentNotes" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "Advertisement_paymentStatus_idx" ON "Advertisement"("paymentStatus");
