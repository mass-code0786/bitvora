CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "uid" VARCHAR(8) NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'USER',
  "sponsorId" TEXT, "sponsorUid" VARCHAR(8), "emailVerified" TIMESTAMP(3), "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Account" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER,
  "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" ("sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);
CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);
CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "scope" TEXT NOT NULL, "userId" TEXT, "requestHash" TEXT,
  "responseData" JSONB, "status" "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3),
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_sponsorId_idx" ON "User"("sponsorId");
CREATE INDEX "User_sponsorUid_idx" ON "User"("sponsorUid");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "IdempotencyRecord_key_scope_key" ON "IdempotencyRecord"("key", "scope");
CREATE INDEX "IdempotencyRecord_userId_idx" ON "IdempotencyRecord"("userId");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

ALTER TABLE "User" ADD CONSTRAINT "User_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
