CREATE TABLE "UserState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" JSONB NOT NULL,
    "trading" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserState_userId_key" ON "UserState"("userId");
ALTER TABLE "UserState" ADD CONSTRAINT "UserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
