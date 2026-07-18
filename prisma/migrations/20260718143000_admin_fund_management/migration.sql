CREATE TABLE "AdminFundTransaction" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userUid" VARCHAR(8) NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminUid" VARCHAR(8) NOT NULL,
    "previousBalance" DECIMAL(18,2) NOT NULL,
    "newBalance" DECIMAL(18,2) NOT NULL,
    "ledgerTransactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminFundTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminFundTransaction_idempotencyKey_key" ON "AdminFundTransaction"("idempotencyKey");
CREATE UNIQUE INDEX "AdminFundTransaction_ledgerTransactionId_key" ON "AdminFundTransaction"("ledgerTransactionId");
CREATE INDEX "AdminFundTransaction_userUid_createdAt_idx" ON "AdminFundTransaction"("userUid", "createdAt");
CREATE INDEX "AdminFundTransaction_adminId_createdAt_idx" ON "AdminFundTransaction"("adminId", "createdAt");
CREATE UNIQUE INDEX "UserNotification_reference_key" ON "UserNotification"("reference");
CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");
ALTER TABLE "AdminFundTransaction" ADD CONSTRAINT "AdminFundTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
