import { describe, expect, it } from "vitest";
import { cloneWalletSeed, creditNowPaymentsDeposit, creditSpotDeposit, deductSpotFund } from "@/lib/wallet-data";

describe("admin fund wallet pipeline",()=>{
  it("credits through the same accounting fields as a successful deposit",()=>{
    const admin=creditSpotDeposit(cloneWalletSeed(),{key:"ADMIN_FUND:test",userId:"user-1",amount:125,title:"Spot Wallet deposit",reference:"admin",timestamp:1});
    const provider=creditNowPaymentsDeposit(cloneWalletSeed(),{providerPaymentId:"payment-1",orderId:"order-1",network:"TRC20",amount:125,txHash:null,timestamp:1});
    expect(admin.wallets.spot.balance).toBe(provider.wallets.spot.balance);
    expect(admin.spotIncome.deposit).toBe(provider.spotIncome.deposit);
    expect(admin.transactions[0]).toMatchObject({wallet:"spot",amount:125,balanceBefore:0,balanceAfter:125,status:"COMPLETED"});
  });

  it("does not apply a repeated idempotency key twice",()=>{
    const first=creditSpotDeposit(cloneWalletSeed(),{key:"ADMIN_FUND:same",userId:"user-1",amount:50,title:"Deposit",reference:"admin",timestamp:1});
    expect(creditSpotDeposit(first,{key:"ADMIN_FUND:same",userId:"user-1",amount:50,title:"Deposit",reference:"admin",timestamp:1})).toBe(first);
  });

  it("rejects deductions that would overdraw Spot Wallet",()=>{
    expect(()=>deductSpotFund(cloneWalletSeed(),{key:"ADMIN_FUND:deduct",userId:"user-1",amount:1,title:"Deduction",reference:"admin",timestamp:1})).toThrow("Insufficient Spot Wallet balance");
  });
});
