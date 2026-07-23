import { describe,expect,it } from "vitest";
import { classifySettlementRecovery } from "@/lib/ai-trade-scale/settlement-recovery";

describe("AI trade settlement recovery classification",()=>{
  it("queues an overdue authoritative trade with no settlement ledger",()=>expect(classifySettlementRecovery({principalReturned:false,profitCredited:false,jobStatus:null})).toBe("OVERDUE_SETTLEMENT"));
  it("repairs a stale status only when both financial ledgers already exist",()=>expect(classifySettlementRecovery({principalReturned:true,profitCredited:true,jobStatus:"FAILED"})).toBe("SETTLED_STATUS_STALE"));
  it("never retries a partial financial settlement automatically",()=>{expect(classifySettlementRecovery({principalReturned:true,profitCredited:false,jobStatus:"FAILED"})).toBe("MANUAL_REVIEW");expect(classifySettlementRecovery({principalReturned:false,profitCredited:true,jobStatus:"FAILED"})).toBe("MANUAL_REVIEW")});
  it("does not repeat a completed job that produced no financial settlement",()=>expect(classifySettlementRecovery({principalReturned:false,profitCredited:false,jobStatus:"COMPLETED"})).toBe("MANUAL_REVIEW"));
});
