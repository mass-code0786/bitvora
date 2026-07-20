ALTER TABLE "ChatMessage"
  ADD COLUMN "matchedIntent" TEXT,
  ADD COLUMN "supportRuleId" TEXT,
  ADD COLUMN "matchScore" DOUBLE PRECISION;

DROP INDEX IF EXISTS "ChatMessage_generationId_key";
DROP INDEX IF EXISTS "ChatMessage_generationStatus_startedAt_idx";
ALTER TABLE "ChatMessage"
  DROP COLUMN IF EXISTS "generationId",
  DROP COLUMN IF EXISTS "generationStatus",
  DROP COLUMN IF EXISTS "startedAt",
  DROP COLUMN IF EXISTS "completedAt",
  DROP COLUMN IF EXISTS "failureCode";

ALTER TABLE "AiSupportRestriction" RENAME TO "SupportChatRestriction";
ALTER INDEX "AiSupportRestriction_userId_key" RENAME TO "SupportChatRestriction_userId_key";
ALTER INDEX "AiSupportRestriction_banned_updatedAt_idx" RENAME TO "SupportChatRestriction_banned_updatedAt_idx";
ALTER TABLE "SupportChatRestriction" RENAME CONSTRAINT "AiSupportRestriction_pkey" TO "SupportChatRestriction_pkey";
ALTER TABLE "SupportChatRestriction" RENAME CONSTRAINT "AiSupportRestriction_userId_fkey" TO "SupportChatRestriction_userId_fkey";

CREATE TABLE "SupportRule" (
  "id" TEXT NOT NULL,
  "intentKey" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "keywordsJson" JSONB NOT NULL,
  "examplesJson" JSONB NOT NULL,
  "followUpsJson" JSONB NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportUnmatchedQuery" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "normalizedMessage" TEXT NOT NULL,
  "resolvedRuleId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportUnmatchedQuery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportRule_intentKey_key" ON "SupportRule"("intentKey");
CREATE INDEX "SupportRule_isActive_priority_intentKey_idx" ON "SupportRule"("isActive", "priority", "intentKey");
CREATE INDEX "SupportRule_category_isActive_priority_idx" ON "SupportRule"("category", "isActive", "priority");
CREATE INDEX "SupportUnmatchedQuery_status_createdAt_id_idx" ON "SupportUnmatchedQuery"("status", "createdAt", "id");
CREATE INDEX "SupportUnmatchedQuery_userId_createdAt_id_idx" ON "SupportUnmatchedQuery"("userId", "createdAt", "id");
CREATE INDEX "SupportUnmatchedQuery_resolvedRuleId_createdAt_idx" ON "SupportUnmatchedQuery"("resolvedRuleId", "createdAt");
CREATE INDEX "ChatMessage_supportRuleId_createdAt_idx" ON "ChatMessage"("supportRuleId", "createdAt");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_supportRuleId_fkey" FOREIGN KEY ("supportRuleId") REFERENCES "SupportRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportUnmatchedQuery" ADD CONSTRAINT "SupportUnmatchedQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportUnmatchedQuery" ADD CONSTRAINT "SupportUnmatchedQuery_resolvedRuleId_fkey" FOREIGN KEY ("resolvedRuleId") REFERENCES "SupportRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
