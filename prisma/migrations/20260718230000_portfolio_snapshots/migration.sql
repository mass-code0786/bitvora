CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" VARCHAR(10) NOT NULL,
    "timezone" TEXT NOT NULL,
    "spotBalance" DECIMAL(18,2) NOT NULL,
    "futureBalance" DECIMAL(18,2) NOT NULL,
    "totalBalance" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortfolioSnapshot_userId_localDate_key" ON "PortfolioSnapshot"("userId", "localDate");
CREATE INDEX "PortfolioSnapshot_userId_localDate_idx" ON "PortfolioSnapshot"("userId", "localDate");
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
