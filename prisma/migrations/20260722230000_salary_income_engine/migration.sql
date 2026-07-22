CREATE TYPE "SalaryCycleStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED');
CREATE TYPE "SalaryEligibilityStatus" AS ENUM ('ELIGIBLE', 'UNQUALIFIED', 'NO_RANK', 'BLOCKED', 'ERROR');
CREATE TYPE "SalaryPaymentStatus" AS ENUM ('PENDING', 'PAID', 'SKIPPED', 'FAILED');

CREATE TABLE "SalaryCycle" (
  "id" TEXT NOT NULL,
  "cycleKey" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "officialTimeZone" TEXT NOT NULL,
  "status" "SalaryCycleStatus" NOT NULL DEFAULT 'PENDING',
  "totalCandidates" INTEGER NOT NULL DEFAULT 0,
  "totalEligible" INTEGER NOT NULL DEFAULT 0,
  "totalPaid" INTEGER NOT NULL DEFAULT 0,
  "totalSkipped" INTEGER NOT NULL DEFAULT 0,
  "totalFailed" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(24,2) NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryPayment" (
  "id" TEXT NOT NULL,
  "salaryCycleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "evaluatedRank" INTEGER NOT NULL DEFAULT 0,
  "salaryAmount" DECIMAL(24,2) NOT NULL DEFAULT 0,
  "eligibilityStatus" "SalaryEligibilityStatus" NOT NULL,
  "eligibilitySnapshotJson" JSONB NOT NULL,
  "paymentStatus" "SalaryPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "skipReason" TEXT,
  "ledgerKey" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryLedger" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "salaryPaymentId" TEXT NOT NULL,
  "salaryCycleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(24,2) NOT NULL,
  "balanceBefore" DECIMAL(24,2) NOT NULL,
  "balanceAfter" DECIMAL(24,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalaryLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalaryCycle_cycleKey_key" ON "SalaryCycle"("cycleKey");
CREATE INDEX "SalaryCycle_status_scheduledAt_idx" ON "SalaryCycle"("status", "scheduledAt");
CREATE INDEX "SalaryCycle_scheduledAt_idx" ON "SalaryCycle"("scheduledAt");
CREATE UNIQUE INDEX "SalaryPayment_ledgerKey_key" ON "SalaryPayment"("ledgerKey");
CREATE UNIQUE INDEX "SalaryPayment_salaryCycleId_userId_key" ON "SalaryPayment"("salaryCycleId", "userId");
CREATE INDEX "SalaryPayment_salaryCycleId_paymentStatus_idx" ON "SalaryPayment"("salaryCycleId", "paymentStatus");
CREATE INDEX "SalaryPayment_userId_createdAt_idx" ON "SalaryPayment"("userId", "createdAt");
CREATE UNIQUE INDEX "SalaryLedger_idempotencyKey_key" ON "SalaryLedger"("idempotencyKey");
CREATE UNIQUE INDEX "SalaryLedger_salaryPaymentId_key" ON "SalaryLedger"("salaryPaymentId");
CREATE INDEX "SalaryLedger_salaryCycleId_createdAt_idx" ON "SalaryLedger"("salaryCycleId", "createdAt");
CREATE INDEX "SalaryLedger_userId_createdAt_idx" ON "SalaryLedger"("userId", "createdAt");

ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_salaryCycleId_fkey" FOREIGN KEY ("salaryCycleId") REFERENCES "SalaryCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalaryLedger" ADD CONSTRAINT "SalaryLedger_salaryPaymentId_fkey" FOREIGN KEY ("salaryPaymentId") REFERENCES "SalaryPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalaryLedger" ADD CONSTRAINT "SalaryLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
