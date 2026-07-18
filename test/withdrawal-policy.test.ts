import { describe, expect, it } from "vitest";
import { cloneWalletSeed, requestSpotWithdrawal } from "@/lib/wallet-data";

describe("withdrawal policy",()=>{
  const funded=()=>{const wallet=cloneWalletSeed();wallet.wallets.spot.balance=100;return wallet};
  it("rejects requests below $10 with the required message",()=>{expect(()=>requestSpotWithdrawal(funded(),{key:"withdrawal-key",userId:"user-1",amount:9.99,network:"TRC20",address:"valid-address",timestamp:1})).toThrow("Minimum withdrawal amount is $10.")});
  it.each([[10,5],[20,15],[100,95]])("charges a fixed $5 fee for a $%s request",(requested,net)=>{const result=requestSpotWithdrawal(funded(),{key:`withdrawal-${requested}`,userId:"user-1",amount:requested,network:"TRC20",address:"valid-address",timestamp:1}),record=result.transactions[0];expect(record.withdrawalDetails).toEqual({requestedAmount:requested,fee:5,netAmount:net,network:"TRC20",address:"valid-address"});expect(result.wallets.spot.balance).toBe(100-requested)});
  it("is idempotent",()=>{const once=requestSpotWithdrawal(funded(),{key:"same-request",userId:"user-1",amount:20,network:"BEP20",address:"valid-address",timestamp:1}),twice=requestSpotWithdrawal(once,{key:"same-request",userId:"user-1",amount:20,network:"BEP20",address:"valid-address",timestamp:2});expect(twice.transactions).toHaveLength(1);expect(twice.wallets.spot.balance).toBe(80)});
});
