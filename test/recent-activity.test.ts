import { describe,expect,it } from "vitest";
import { formatLegacyRecentActivity,mapAuthoritativeAiActivity,mergeRecentActivity,type AuthoritativeActivityInput } from "@/lib/recent-activity";
import type { WalletTransaction } from "@/lib/wallet-data";

const legacy=(overrides:Partial<WalletTransaction>={}):WalletTransaction=>({
  id:"legacy-1",userId:"user-1",wallet:"future",type:"AI_TRADE_CAPITAL_LOCKED",title:"Capital Locked",amount:-0.86,balanceBefore:10,balanceAfter:9.14,status:"COMPLETED",reference:"trade:trade-1 · session:session-1",timestamp:1000,...overrides
});
const ledger=(overrides:Partial<AuthoritativeActivityInput>={}):AuthoritativeActivityInput=>({
  id:"ledger-1",idempotencyKey:"TRADE_LOCK:trade-1",tradeId:"trade-1",operation:"PRINCIPAL_LOCK",amount:"-0.86",officialAt:new Date(1000),...overrides
});

describe("Recent Activity financial display",()=>{
  it("sanitizes old provider-branded deposit records without rewriting them",()=>{
    const stored=legacy({id:"NOWPAYMENTS_DEPOSIT_CREDIT:pay-1:credit",wallet:"spot",type:"NOWPAYMENTS_DEPOSIT",title:"NOWPayments USDT deposit",amount:1,reference:"NOWPayments pay-1 · order-1 · BEP20"});
    const activity=formatLegacyRecentActivity([stored])[0];
    expect(activity).toMatchObject({title:"USDT Deposit Credited",type:"DEPOSIT_CREDITED",amount:1});
    expect(`${activity.title} ${activity.type}`).not.toMatch(/NOWPayments|NOWPAYMENTS_DEPOSIT/);
    expect(stored.title).toBe("NOWPayments USDT deposit");
  });
  it("shows authoritative principal lock only after its ledger row exists and as a debit",()=>{
    expect(mergeRecentActivity([],[])).toEqual([]);
    expect(mapAuthoritativeAiActivity(ledger())).toMatchObject({title:"Trade Principal Locked",type:"AI_TRADE_PRINCIPAL_LOCKED",amount:-0.86,source:"AI_WALLET_LEDGER"});
  });
  it("keeps principal return and profit as separate positive settlement activities",()=>{
    const returned=mapAuthoritativeAiActivity(ledger({id:"ledger-return",idempotencyKey:"TRADE_PRINCIPAL_RETURN:trade-1",operation:"PRINCIPAL_RETURN",amount:"0.86"}));
    const profit=mapAuthoritativeAiActivity(ledger({id:"ledger-profit",idempotencyKey:"TRADE_PROFIT:trade-1",operation:"PROFIT_CREDIT",amount:"0.38"}));
    expect(returned).toMatchObject({title:"Trade Principal Returned",type:"AI_TRADE_PRINCIPAL_RETURNED",amount:0.86});
    expect(profit).toMatchObject({title:"Trade Profit Credited",type:"AI_TRADE_PROFIT_CREDITED",amount:0.38});
    expect(mergeRecentActivity([returned!,profit!],[])).toHaveLength(2);
  });
  it("does not infer a principal lock from queue creation",()=>{
    expect(mapAuthoritativeAiActivity(ledger({operation:"QUEUE_CREATED"}))).toBeNull();
  });
  it("deduplicates deposit retries and prefers relational AI ledger events",()=>{
    const deposits=formatLegacyRecentActivity([
      legacy({id:"NOWPAYMENTS_DEPOSIT_CREDIT:pay-1:credit",wallet:"spot",type:"NOWPAYMENTS_DEPOSIT",title:"NOWPayments USDT deposit",amount:1,reference:"NOWPayments pay-1 · order-1",timestamp:2000}),
      legacy({id:"retry",wallet:"spot",type:"NOWPAYMENTS_DEPOSIT",title:"provider retry",amount:1,reference:"NOWPayments pay-1 · order-1",timestamp:2001})
    ]);
    const authoritative=mapAuthoritativeAiActivity(ledger())!;
    const mirrored=formatLegacyRecentActivity([legacy()]);
    const merged=mergeRecentActivity([authoritative],[...deposits,...mirrored]);
    expect(merged.filter(item=>item.type==="DEPOSIT_CREDITED")).toHaveLength(1);
    expect(merged.filter(item=>item.type==="AI_TRADE_PRINCIPAL_LOCKED")).toEqual([authoritative]);
  });
  it("is read-only and preserves balance and ledger invariants",()=>{
    const stored=legacy(),snapshot=structuredClone(stored);
    const authoritative=mapAuthoritativeAiActivity(ledger())!;
    formatLegacyRecentActivity([stored]);mergeRecentActivity([authoritative],formatLegacyRecentActivity([stored]));
    expect(stored).toEqual(snapshot);
    expect(authoritative.amount).toBe(-0.86);
  });
});
