ALTER TABLE "ReferralIncomeEntry" ADD COLUMN "incomeType" TEXT;
UPDATE "ReferralIncomeEntry"
SET "incomeType" = CASE WHEN "transactionType" = 'SPOT_REFERRAL_INCOME' THEN 'REFERRAL_INCOME' ELSE 'LEVEL_INCOME' END;
ALTER TABLE "ReferralIncomeEntry" ALTER COLUMN "incomeType" SET NOT NULL;
DROP INDEX "ReferralIncomeEntry_distributionId_recipientUserId_level_key";
CREATE UNIQUE INDEX "ReferralIncomeEntry_distributionId_recipientUserId_incomeType_level_key"
ON "ReferralIncomeEntry"("distributionId", "recipientUserId", "incomeType", "level");
