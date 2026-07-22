CREATE TABLE "AiBotTradeExecution" (
  "id" TEXT NOT NULL,
  "executionKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "tradingDate" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "timeZone" TEXT NOT NULL,
  "tradeType" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLACED',
  "placedAt" TIMESTAMP(3) NOT NULL,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiBotTradeExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiBotTradeExecution_executionKey_key" ON "AiBotTradeExecution"("executionKey");
CREATE UNIQUE INDEX "AiBotTradeExecution_tradeId_key" ON "AiBotTradeExecution"("tradeId");
CREATE UNIQUE INDEX "AiBotTradeExecution_userId_tradingDate_sessionId_tradeType_key" ON "AiBotTradeExecution"("userId", "tradingDate", "sessionId", "tradeType");
CREATE INDEX "AiBotTradeExecution_status_placedAt_idx" ON "AiBotTradeExecution"("status", "placedAt");
CREATE INDEX "AiBotTradeExecution_userId_tradingDate_idx" ON "AiBotTradeExecution"("userId", "tradingDate");
ALTER TABLE "AiBotTradeExecution" ADD CONSTRAINT "AiBotTradeExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiBotTradeExecution" ADD CONSTRAINT "AiBotTradeExecution_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "AiBotSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
