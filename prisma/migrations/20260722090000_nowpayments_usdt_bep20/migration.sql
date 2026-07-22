CREATE TABLE "NowPaymentsDeposit" (
  "id" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "usdtAmount" DECIMAL(24,8) NOT NULL, "requestedAmount" DECIMAL(18,2) NOT NULL,
  "walletAddress" TEXT NOT NULL, "txHash" TEXT, "status" TEXT NOT NULL,
  "providerStatus" TEXT NOT NULL, "credited" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NowPaymentsDeposit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NowPaymentsDeposit_paymentId_key" ON "NowPaymentsDeposit"("paymentId");
CREATE UNIQUE INDEX "NowPaymentsDeposit_orderId_key" ON "NowPaymentsDeposit"("orderId");
CREATE UNIQUE INDEX "NowPaymentsDeposit_userId_idempotencyKey_key" ON "NowPaymentsDeposit"("userId", "idempotencyKey");
CREATE INDEX "NowPaymentsDeposit_userId_createdAt_idx" ON "NowPaymentsDeposit"("userId", "createdAt");
CREATE INDEX "NowPaymentsDeposit_status_createdAt_idx" ON "NowPaymentsDeposit"("status", "createdAt");
ALTER TABLE "NowPaymentsDeposit" ADD CONSTRAINT "NowPaymentsDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
