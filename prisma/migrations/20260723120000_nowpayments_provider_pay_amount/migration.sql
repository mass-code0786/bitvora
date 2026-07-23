ALTER TABLE "NowPaymentsDeposit"
ADD COLUMN "providerPayAmount" DECIMAL(24,8);

UPDATE "NowPaymentsDeposit"
SET "providerPayAmount" = "requestedAmount"
WHERE "providerPayAmount" IS NULL;

ALTER TABLE "NowPaymentsDeposit"
ALTER COLUMN "providerPayAmount" SET NOT NULL;
