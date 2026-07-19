CREATE TYPE "ReferralDistributionStatus" AS ENUM ('CREATED', 'NO_PAYOUT');

CREATE TABLE "ReferralDistribution" (
  "id" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL DEFAULT 'FIRST_SPOT_TO_FUTURE',
  "sourceTransferId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "transferAmount" DECIMAL(18,2) NOT NULL,
  "status" "ReferralDistributionStatus" NOT NULL,
  "resultCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralDistribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralIncomeEntry" (
  "id" TEXT NOT NULL,
  "distributionId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "sourceReferredUserId" TEXT NOT NULL,
  "sourceTransferId" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "transactionType" TEXT NOT NULL,
  "ledgerTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralIncomeEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralDistribution_sourceTransferId_key" ON "ReferralDistribution"("sourceTransferId");
CREATE UNIQUE INDEX "ReferralDistribution_idempotencyKey_key" ON "ReferralDistribution"("idempotencyKey");
CREATE UNIQUE INDEX "ReferralDistribution_referredUserId_eventType_key" ON "ReferralDistribution"("referredUserId", "eventType");
CREATE INDEX "ReferralDistribution_referredUserId_createdAt_idx" ON "ReferralDistribution"("referredUserId", "createdAt");
CREATE UNIQUE INDEX "ReferralIncomeEntry_ledgerTransactionId_key" ON "ReferralIncomeEntry"("ledgerTransactionId");
CREATE UNIQUE INDEX "ReferralIncomeEntry_distributionId_recipientUserId_level_key" ON "ReferralIncomeEntry"("distributionId", "recipientUserId", "level");
CREATE INDEX "ReferralIncomeEntry_recipientUserId_createdAt_idx" ON "ReferralIncomeEntry"("recipientUserId", "createdAt");
CREATE INDEX "ReferralIncomeEntry_sourceReferredUserId_sourceTransferId_idx" ON "ReferralIncomeEntry"("sourceReferredUserId", "sourceTransferId");
ALTER TABLE "ReferralDistribution" ADD CONSTRAINT "ReferralDistribution_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralIncomeEntry" ADD CONSTRAINT "ReferralIncomeEntry_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "ReferralDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralIncomeEntry" ADD CONSTRAINT "ReferralIncomeEntry_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
