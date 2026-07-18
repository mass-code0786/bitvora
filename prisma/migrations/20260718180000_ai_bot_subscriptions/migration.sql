CREATE TYPE "AiBotSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED');

CREATE TABLE "AiBotSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "status" "AiBotSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "purchaseTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiBotSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiBotSubscription_purchaseTransactionId_key" ON "AiBotSubscription"("purchaseTransactionId");
CREATE INDEX "AiBotSubscription_userId_activatedAt_idx" ON "AiBotSubscription"("userId", "activatedAt");
CREATE INDEX "AiBotSubscription_userId_expiresAt_idx" ON "AiBotSubscription"("userId", "expiresAt");
ALTER TABLE "AiBotSubscription" ADD CONSTRAINT "AiBotSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
