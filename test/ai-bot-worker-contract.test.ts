import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
const worker=fs.readFileSync(path.join(process.cwd(),"lib/ai-bot-auto-trade.server.ts"),"utf8"),schema=fs.readFileSync(path.join(process.cwd(),"prisma/schema.prisma"),"utf8"),ecosystem=fs.readFileSync(path.join(process.cwd(),"ecosystem.config.js"),"utf8"),audit=fs.readFileSync(path.join(process.cwd(),"scripts/audit-ai-bot-trades.ts"),"utf8");
describe("AI Bot worker persistence contract",()=>{
  it("registers isolated durable queue processes",()=>{for(const name of ["bitvora-ai-session-orchestrator","bitvora-ai-trade-worker","bitvora-ai-settlement-worker","bitvora-outbox-worker"])expect(ecosystem).toContain(name);expect(ecosystem).not.toContain("bitvora-ai-auto-trade-worker")});
  it("uses a session-specific unique execution and a user-state row lock",()=>{expect(worker).toContain("${userId}:${tradingDate}:${sessionId}:AI_BOT");expect(worker).toContain('FOR UPDATE');expect(schema).toMatch(/@@unique\(\[userId, tradingDate, sessionId, tradeType\]\)/);expect(schema).toMatch(/executionKey\s+String\s+@unique/)});
  it("checks subscription, balance, timezone, additional eligibility, and independent settlement",()=>{for(const value of ["status:\"ACTIVE\"","expiresAt:{gt:new Date(now)}","resolveUserTimeZone","INSUFFICIENT_BALANCE","FIRST_DEPOSIT_BONUS_MS","settleAiBotExecution"])expect(worker).toContain(value)});
  it("provides dry-run audit and explicit no-profit missed repair",()=>{expect(audit).toContain('mode:repair?"REPAIR_DUPLICATE_MISSED":"DRY_RUN"');expect(audit).toContain("noHistoricalProfitCredited:true");expect(audit).toContain("--repair-recent-missed")});
});
