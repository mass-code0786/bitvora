import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mergeVisibleTrades,type VisibleTrade } from "@/lib/trade-history-compat";
const source=(file:string)=>readFileSync(resolve(process.cwd(),file),"utf8");
const trade=(overrides:Partial<VisibleTrade>={}):VisibleTrade=>({id:"trade-1",source:"RELATIONAL",sourceId:"trade-1",executionKey:"AI_TRADE:1",sessionId:"session-1",pair:"ETH/USDT",direction:"BUY",placementSource:"AI_BOT",status:"SETTLED",profitReceived:1,placedAt:1000,settledAt:2000,principal:10,balanceSnapshot:1000,profitRate:1,...overrides});

describe("production data visibility compatibility",()=>{
  it("keeps unmigrated legacy history visible",()=>expect(mergeVisibleTrades([], [trade({source:"LEGACY_COMPATIBILITY",sourceId:"legacy-1"})])).toHaveLength(1));
  it("deduplicates relational and legacy execution keys",()=>expect(mergeVisibleTrades([trade()], [trade({id:"legacy",source:"LEGACY_COMPATIBILITY",sourceId:"legacy-1"})])).toHaveLength(1));
  it("deduplicates migrated legacy source IDs",()=>expect(mergeVisibleTrades([], [trade({source:"LEGACY_COMPATIBILITY",sourceId:"legacy-1"})],new Set(["legacy-1"]))).toHaveLength(0));
  it("marks legacy rows read-only compatibility",()=>expect(mergeVisibleTrades([], [trade({source:"LEGACY_COMPATIBILITY"})])[0].source).toBe("LEGACY_COMPATIBILITY"));
  it("does not expose settlement functions from the compatibility module",()=>expect(source("lib/trade-history-compat.server.ts")).not.toMatch(/settleUserTrade|creditAiProfit|returnTradePrincipal/));
  it("loads new trades from AiFinancialTrade",()=>expect(source("lib/trade-history-compat.server.ts")).toContain("aiFinancialTrade.findMany"));
  it("uses the shared canonical sponsor relationships for direct membership",()=>{const route=source("app/api/team/route.ts"),helper=source("lib/direct-members.ts");expect(route).toContain("canonicalDirectMemberWhere(parent)");expect(helper).toContain('u."sponsorId"=${parent.id}');expect(helper).toContain('u."sponsorUid"=${parent.uid}')});
  it("does not filter the direct member list by qualification",()=>expect(source("lib/direct-members.ts")).not.toMatch(/retainedPrincipal|financialWallet|>=50/));
  it("falls back when a relational wallet is missing",()=>expect(source("lib/future-wallet.server.ts")).toContain('source:"LEGACY_COMPATIBILITY"'));
  it("keeps compatibility wallet reads non-mutating",()=>{const body=source("lib/future-wallet.server.ts").split("export async function getWalletReadSnapshot")[1].split("type Mutation")[0];expect(body).not.toMatch(/create|update|upsert|ensureFutureWallet|lockFutureWallet/)});
  it("keeps compatibility history reads non-mutating",()=>{const body=source("lib/trade-history-compat.server.ts");expect(body).not.toMatch(/\.create\(|\.update\(|\.upsert\(|\.delete\(/)});
  it("provides a read-only focused audit",()=>expect(source("scripts/production-data-visibility-audit.ts")).toContain('mode:"READ_ONLY"'));
});
