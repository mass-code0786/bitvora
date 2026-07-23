CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING_ADMIN_REVIEW','REQUESTED','VALIDATING','QUEUED','PROCESSING','BROADCASTED','CONFIRMING','COMPLETED','RETRYABLE_FAILED','MANUAL_REVIEW','REJECTED','CANCELLED');
CREATE TYPE "WithdrawalJobStatus" AS ENUM ('PENDING','ENQUEUED','PROCESSING','COMPLETED','RETRYABLE_FAILED','MANUAL_REVIEW');
CREATE TYPE "WithdrawalBroadcastStatus" AS ENUM ('RESERVED','SIGNING','BROADCASTED','CONFIRMED','FAILED','UNCERTAIN');
ALTER TABLE "User" ADD COLUMN "withdrawalsSuspended" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Withdrawal" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "clientRequestId" TEXT NOT NULL,
  "dailyKey" TEXT NOT NULL, "userLocalDate" VARCHAR(10) NOT NULL, "userTimeZone" TEXT NOT NULL, "processingMode" TEXT NOT NULL,
  "requestIdempotencyKey" TEXT NOT NULL, "debitIdempotencyKey" TEXT NOT NULL,
  "payoutIdempotencyKey" TEXT NOT NULL, "refundIdempotencyKey" TEXT NOT NULL,
  "asset" TEXT NOT NULL DEFAULT 'USDT', "chain" TEXT NOT NULL DEFAULT 'EVM',
  "network" TEXT NOT NULL, "chainId" INTEGER NOT NULL, "tokenContract" TEXT NOT NULL,
  "tokenDecimals" INTEGER NOT NULL, "destinationAddress" TEXT NOT NULL,
  "requestedAmount" DECIMAL(24,8) NOT NULL, "platformFee" DECIMAL(24,8) NOT NULL,
  "networkFeeBaseUnits" DECIMAL(36,0) NOT NULL DEFAULT 0, "networkFeeAsset" TEXT NOT NULL DEFAULT 'BNB',
  "recipientAmount" DECIMAL(24,8) NOT NULL,
  "debitedAmount" DECIMAL(24,8) NOT NULL, "status" "WithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
  "txHash" TEXT, "confirmations" INTEGER NOT NULL DEFAULT 0, "requiredConfirmations" INTEGER NOT NULL,
  "broadcastedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "failureCode" TEXT, "failureMessage" TEXT, "riskReason" TEXT, "reviewedByAdminId" TEXT,
  "approvedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3), "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Withdrawal_broadcast_hash_required" CHECK ("status" NOT IN ('BROADCASTED','CONFIRMING','COMPLETED') OR "txHash" IS NOT NULL),
  CONSTRAINT "Withdrawal_completed_hash_required" CHECK ("status" <> 'COMPLETED' OR ("txHash" IS NOT NULL AND "confirmedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "Withdrawal_userId_clientRequestId_key" ON "Withdrawal"("userId","clientRequestId");
CREATE UNIQUE INDEX "Withdrawal_dailyKey_key" ON "Withdrawal"("dailyKey");
CREATE UNIQUE INDEX "Withdrawal_requestIdempotencyKey_key" ON "Withdrawal"("requestIdempotencyKey");
CREATE UNIQUE INDEX "Withdrawal_debitIdempotencyKey_key" ON "Withdrawal"("debitIdempotencyKey");
CREATE UNIQUE INDEX "Withdrawal_payoutIdempotencyKey_key" ON "Withdrawal"("payoutIdempotencyKey");
CREATE UNIQUE INDEX "Withdrawal_refundIdempotencyKey_key" ON "Withdrawal"("refundIdempotencyKey");
CREATE UNIQUE INDEX "Withdrawal_txHash_key" ON "Withdrawal"("txHash");
CREATE INDEX "Withdrawal_userId_createdAt_idx" ON "Withdrawal"("userId","createdAt");
CREATE INDEX "Withdrawal_status_updatedAt_idx" ON "Withdrawal"("status","updatedAt");

CREATE TABLE "WithdrawalLedger" (
  "id" TEXT PRIMARY KEY, "withdrawalId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "operation" TEXT NOT NULL, "amount" DECIMAL(24,8) NOT NULL,
  "balanceBefore" DECIMAL(24,8) NOT NULL, "balanceAfter" DECIMAL(24,8) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithdrawalLedger_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE RESTRICT,
  CONSTRAINT "WithdrawalLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "WithdrawalLedger_idempotencyKey_key" ON "WithdrawalLedger"("idempotencyKey");
CREATE INDEX "WithdrawalLedger_withdrawalId_operation_idx" ON "WithdrawalLedger"("withdrawalId","operation");
CREATE INDEX "WithdrawalLedger_userId_createdAt_idx" ON "WithdrawalLedger"("userId","createdAt");

CREATE TABLE "WithdrawalJob" (
  "id" TEXT PRIMARY KEY, "withdrawalId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "jobKey" TEXT NOT NULL, "bullJobId" TEXT NOT NULL,
  "status" "WithdrawalJobStatus" NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT, "nextAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WithdrawalJob_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "WithdrawalJob_jobKey_key" ON "WithdrawalJob"("jobKey");
CREATE UNIQUE INDEX "WithdrawalJob_bullJobId_key" ON "WithdrawalJob"("bullJobId");
CREATE UNIQUE INDEX "WithdrawalJob_withdrawalId_kind_key" ON "WithdrawalJob"("withdrawalId","kind");
CREATE INDEX "WithdrawalJob_status_nextAttemptAt_idx" ON "WithdrawalJob"("status","nextAttemptAt");

CREATE TABLE "WithdrawalBroadcastAttempt" (
  "id" TEXT PRIMARY KEY, "withdrawalId" TEXT NOT NULL, "chain" TEXT NOT NULL, "network" TEXT NOT NULL,
  "fromAddress" TEXT NOT NULL, "toAddress" TEXT NOT NULL, "requestedAmount" DECIMAL(24,8) NOT NULL,
  "networkFee" DECIMAL(36,0) NOT NULL, "nonce" BIGINT NOT NULL, "signedTransactionHash" TEXT,
  "txHash" TEXT, "successKey" TEXT, "attemptNumber" INTEGER NOT NULL,
  "status" "WithdrawalBroadcastStatus" NOT NULL DEFAULT 'RESERVED', "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WithdrawalBroadcastAttempt_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "WithdrawalBroadcastAttempt_txHash_key" ON "WithdrawalBroadcastAttempt"("txHash");
CREATE UNIQUE INDEX "WithdrawalBroadcastAttempt_successKey_key" ON "WithdrawalBroadcastAttempt"("successKey");
CREATE UNIQUE INDEX "WithdrawalBroadcastAttempt_withdrawalId_attemptNumber_key" ON "WithdrawalBroadcastAttempt"("withdrawalId","attemptNumber");
CREATE UNIQUE INDEX "WithdrawalBroadcastAttempt_chain_network_fromAddress_nonce_key" ON "WithdrawalBroadcastAttempt"("chain","network","fromAddress","nonce");
CREATE INDEX "WithdrawalBroadcastAttempt_withdrawalId_status_idx" ON "WithdrawalBroadcastAttempt"("withdrawalId","status");

CREATE TABLE "WithdrawalAdminAudit" (
  "id" TEXT PRIMARY KEY, "withdrawalId" TEXT NOT NULL, "adminId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "previousStatus" "WithdrawalStatus" NOT NULL, "nextStatus" "WithdrawalStatus" NOT NULL,
  "txHash" TEXT, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithdrawalAdminAudit_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal"("id") ON DELETE RESTRICT,
  CONSTRAINT "WithdrawalAdminAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE INDEX "WithdrawalAdminAudit_withdrawalId_createdAt_idx" ON "WithdrawalAdminAudit"("withdrawalId","createdAt");
CREATE INDEX "WithdrawalAdminAudit_adminId_createdAt_idx" ON "WithdrawalAdminAudit"("adminId","createdAt");
CREATE TABLE "WithdrawalSystemState" (
  "id" TEXT PRIMARY KEY DEFAULT 'default', "signerAvailable" BOOLEAN NOT NULL DEFAULT false,
  "signerAddress" TEXT, "workerHeartbeatAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL
);
