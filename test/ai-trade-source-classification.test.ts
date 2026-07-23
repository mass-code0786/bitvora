import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDailySessions,createEmptyTradingStore,migrateTradingStore,placeUserTrade } from "@/lib/ai-trading-engine";
import { resolveAuthoritativeTradeSource,resolveLegacyTradeSource,tradeSourceLabel } from "@/lib/trade-source";

const source=(file:string)=>readFileSync(resolve(process.cwd(),file),"utf8");

describe("AI trade source classification",()=>{
  it("stores and displays scheduled AI Bot trades as AI Bot",()=>{
    const session=createDailySessions("2026-08-01",0,"Asia/Kolkata")[0],trade=placeUserTrade({store:createEmptyTradingStore(),session,userId:"user",userUid:"BV100001",futureBalance:100,now:session.liveFrom,placementSource:"AI_BOT"}).trade,resolved=resolveAuthoritativeTradeSource({placementSource:trade.placementSource,tradeType:"AI_BOT",sessionTradeType:"AI_BOT"});
    expect(trade.placementSource).toBe("AI_BOT");expect(tradeSourceLabel(resolved,"RELATIONAL")).toBe("AI Bot");
  });
  it("stores and displays a user intent trade as Manual",()=>{
    const intent=source("lib/ai-trade-intent.server.ts");expect(intent).toContain('enqueueUserSessionTrade(user.id,value.session.id,"MANUAL"');
    expect(tradeSourceLabel(resolveAuthoritativeTradeSource({placementSource:"MANUAL",tradeType:"MANUAL",sessionTradeType:"MANUAL"}),"RELATIONAL")).toBe("Manual");
  });
  it("never defaults a missing source to Manual",()=>{
    expect(resolveAuthoritativeTradeSource({})).toBe("UNKNOWN");
    expect(tradeSourceLabel(resolveAuthoritativeTradeSource({}),"RELATIONAL")).toBe("Trade");
    expect(migrateTradingStore({version:1,trades:[{id:"legacy"}]}).trades[0].placementSource).toBe("UNKNOWN");
  });
  it("uses a neutral legacy label unless AI Bot provenance exists",()=>{
    expect(tradeSourceLabel(resolveLegacyTradeSource({}),"LEGACY_COMPATIBILITY")).toBe("Legacy Trade");
    expect(tradeSourceLabel(resolveLegacyTradeSource({hasAiBotExecution:true}),"LEGACY_COMPATIBILITY")).toBe("AI Bot");
  });
  it("preserves AI Bot source through scheduled recovery and catch-up",()=>{
    const orchestrator=source("lib/ai-trade-scale/orchestrator.ts"),financial=source("lib/ai-trade-scale/financial.ts");
    expect(orchestrator).toContain('tradeType:"AI_BOT"');
    expect(orchestrator).toContain('job.kind==="CREATE"');
    expect(financial).toContain('run.tradeType==="AI_BOT"?"AI_BOT":"UNKNOWN"');
  });
  it("renders the UI label returned from the authoritative source formatter",()=>{
    const api=source("app/api/ai-trading/route.ts"),ui=source("components/copy-trading-module.tsx");
    expect(api).toContain("tradeSourceLabel(trade.placementSource,trade.source)");
    expect(ui).toContain("trade.sourceLabel");
    expect(ui).not.toContain('placementSource==="AI_BOT"?"AI Bot":"Manual"');
  });
});
