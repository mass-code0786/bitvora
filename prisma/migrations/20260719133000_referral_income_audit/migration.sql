CREATE TABLE "ReferralIncomeAuditLog" (
  "id" TEXT NOT NULL,
  "distributionId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "sourceReferredUserId" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "ledgerTransactionId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralIncomeAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferralIncomeAuditLog_ledgerTransactionId_key" ON "ReferralIncomeAuditLog"("ledgerTransactionId");
CREATE INDEX "ReferralIncomeAuditLog_distributionId_createdAt_idx" ON "ReferralIncomeAuditLog"("distributionId", "createdAt");
CREATE INDEX "ReferralIncomeAuditLog_recipientUserId_createdAt_idx" ON "ReferralIncomeAuditLog"("recipientUserId", "createdAt");
ALTER TABLE "ReferralIncomeAuditLog" ADD CONSTRAINT "ReferralIncomeAuditLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
