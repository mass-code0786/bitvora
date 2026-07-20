ALTER TABLE "ChatMessage"
  ADD COLUMN "generationId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "generationStatus" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "failureCode" TEXT;

CREATE TABLE "SupportAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "chatSessionId" TEXT,
  "ticketId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatMessage_generationId_key" ON "ChatMessage"("generationId");
CREATE UNIQUE INDEX "ChatMessage_idempotencyKey_key" ON "ChatMessage"("idempotencyKey");
CREATE INDEX "SupportTicket_userId_updatedAt_id_idx" ON "SupportTicket"("userId", "updatedAt", "id");
CREATE INDEX "SupportTicket_status_updatedAt_id_idx" ON "SupportTicket"("status", "updatedAt", "id");
CREATE INDEX "ChatSession_userId_deletedAt_lastMessageAt_id_idx" ON "ChatSession"("userId", "deletedAt", "lastMessageAt", "id");
CREATE INDEX "ChatSession_unreadCount_lastMessageAt_idx" ON "ChatSession"("unreadCount", "lastMessageAt");
CREATE INDEX "ChatMessage_conversationId_createdAt_id_idx" ON "ChatMessage"("conversationId", "createdAt", "id");
CREATE INDEX "ChatMessage_generationStatus_startedAt_idx" ON "ChatMessage"("generationStatus", "startedAt");
CREATE INDEX "SupportAuditLog_adminUserId_createdAt_id_idx" ON "SupportAuditLog"("adminUserId", "createdAt", "id");
CREATE INDEX "SupportAuditLog_targetUserId_createdAt_id_idx" ON "SupportAuditLog"("targetUserId", "createdAt", "id");
CREATE INDEX "SupportAuditLog_chatSessionId_createdAt_id_idx" ON "SupportAuditLog"("chatSessionId", "createdAt", "id");
CREATE INDEX "SupportAuditLog_ticketId_createdAt_id_idx" ON "SupportAuditLog"("ticketId", "createdAt", "id");

ALTER TABLE "SupportAuditLog" ADD CONSTRAINT "SupportAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportAuditLog" ADD CONSTRAINT "SupportAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
