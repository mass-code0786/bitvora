import { describe, expect, it } from "vitest";
import { createDailySessions, createEmptyTradingStore, placeUserTrade, settleUserTrade } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, lockFutureTradeCapital, settleFutureTrade } from "@/lib/wallet-data";

for(const source of ["MANUAL","AI_BOT"] as const)describe(`${source} AI trade timeline`,()=>{
  it("locks capital without a profit credit, then settles into two idempotent credits",()=>{
    const session=createDailySessions("2026-07-18",0)[0],seed=cloneWalletSeed();seed.wallets.future.balance=1000;
    const placed=placeUserTrade({store:createEmptyTradingStore(),session,userId:"user-1",userUid:"BV100001",futureBalance:1000,now:session.liveFrom,placementSource:source}),trade=placed.trade,details={userUid:trade.userUid,tradeId:trade.id,sessionId:session.id,pair:session.pair,direction:trade.direction,source,grossFutureBalance:trade.balanceSnapshot,tradeCapital:trade.tradeCapital,profitPercentage:trade.profitRate,profitAmount:trade.profitAmount};
    const locked=lockFutureTradeCapital(seed,trade.tradeCapital,trade.idempotencyKey,details,trade.placedAt);
    expect(trade.status).toBe("PLACED");expect(locked.wallets.future.balance).toBe(990);expect(locked.lockedFutureTradeCapital).toBe(10);expect(locked.transactions.map(item=>item.type)).toEqual(["AI_TRADE_CAPITAL_LOCKED"]);expect(locked.totalCompletedTradingProfit).toBe(0);
    const settledTrade=settleUserTrade(placed.store,trade.id,session,session.settlesAt),settled=settleFutureTrade(locked,{capital:trade.tradeCapital,profit:trade.profitAmount,key:`AI_SETTLE:${trade.id}`,additional:false,details,timestamp:session.settlesAt}),retried=settleFutureTrade(settled,{capital:trade.tradeCapital,profit:trade.profitAmount,key:`AI_SETTLE:${trade.id}`,additional:false,details,timestamp:session.settlesAt+1});
    expect(settledTrade.trade.status).toBe("SETTLED");expect(settled.lockedFutureTradeCapital).toBe(0);expect(settled.transactions.map(item=>item.type)).toEqual(["AI_TRADE_PROFIT_CREDITED","AI_TRADE_PRINCIPAL_RETURNED","AI_TRADE_CAPITAL_LOCKED"]);expect(retried).toBe(settled);expect(new Set(settled.transactions.map(item=>item.id)).size).toBe(3);
  });
});
