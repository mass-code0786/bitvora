CREATE TABLE "AiBotSponsorIncome" (
  "id" TEXT NOT NULL,
  "sponsorUserId" TEXT NOT NULL,
  "buyerUserId" TEXT NOT NULL,
  "botSubscriptionId" TEXT NOT NULL,
  "botPurchaseTransactionId" TEXT NOT NULL,
  "purchaseAmount" DECIMAL(18,2) NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "commissionAmount" DECIMAL(18,2) NOT NULL,
  "ledgerTransactionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiBotSponsorIncome_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiBotSponsorIncomeAuditLog" (
  "id" TEXT NOT NULL,
  "sponsorIncomeId" TEXT NOT NULL,
  "sponsorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ledgerTransactionId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiBotSponsorIncomeAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiBotSponsorIncome_botSubscriptionId_key" ON "AiBotSponsorIncome"("botSubscriptionId");
CREATE UNIQUE INDEX "AiBotSponsorIncome_botPurchaseTransactionId_key" ON "AiBotSponsorIncome"("botPurchaseTransactionId");
CREATE UNIQUE INDEX "AiBotSponsorIncome_ledgerTransactionId_key" ON "AiBotSponsorIncome"("ledgerTransactionId");
CREATE INDEX "AiBotSponsorIncome_sponsorUserId_createdAt_idx" ON "AiBotSponsorIncome"("sponsorUserId", "createdAt");
CREATE INDEX "AiBotSponsorIncome_buyerUserId_createdAt_idx" ON "AiBotSponsorIncome"("buyerUserId", "createdAt");
CREATE UNIQUE INDEX "AiBotSponsorIncomeAuditLog_sponsorIncomeId_key" ON "AiBotSponsorIncomeAuditLog"("sponsorIncomeId");
CREATE UNIQUE INDEX "AiBotSponsorIncomeAuditLog_ledgerTransactionId_key" ON "AiBotSponsorIncomeAuditLog"("ledgerTransactionId");
CREATE INDEX "AiBotSponsorIncomeAuditLog_sponsorUserId_createdAt_idx" ON "AiBotSponsorIncomeAuditLog"("sponsorUserId", "createdAt");
ALTER TABLE "AiBotSponsorIncome" ADD CONSTRAINT "AiBotSponsorIncome_sponsorUserId_fkey" FOREIGN KEY ("sponsorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiBotSponsorIncome" ADD CONSTRAINT "AiBotSponsorIncome_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiBotSponsorIncome" ADD CONSTRAINT "AiBotSponsorIncome_botSubscriptionId_fkey" FOREIGN KEY ("botSubscriptionId") REFERENCES "AiBotSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiBotSponsorIncomeAuditLog" ADD CONSTRAINT "AiBotSponsorIncomeAuditLog_sponsorIncomeId_fkey" FOREIGN KEY ("sponsorIncomeId") REFERENCES "AiBotSponsorIncome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiBotSponsorIncomeAuditLog" ADD CONSTRAINT "AiBotSponsorIncomeAuditLog_sponsorUserId_fkey" FOREIGN KEY ("sponsorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
