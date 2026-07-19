import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildFirstTransferPayoutPlan, distributeFirstSpotToFuture } from "@/lib/referral/first-transfer.server";
import { cloneWalletSeed, transferBetweenWallets } from "@/lib/wallet-data";

const users=[
  {id:"source",uid:"BV900000",sponsorId:"direct",sponsorUid:"BV900001"},
  {id:"direct",uid:"BV900001",sponsorId:"l1",sponsorUid:"BV900002"},
  {id:"l1",uid:"BV900002",sponsorId:"l2",sponsorUid:"BV900003"},
  {id:"l2",uid:"BV900003",sponsorId:"l3",sponsorUid:"BV900004"},
  {id:"l3",uid:"BV900004",sponsorId:"l4",sponsorUid:"BV900005"},
  {id:"l4",uid:"BV900005",sponsorId:"l5",sponsorUid:"BV900006"},
  {id:"l5",uid:"BV900006",sponsorId:null,sponsorUid:null},
];

describe("first Spot to Future referral",()=>{
  it("calculates separate 5% referral and Level 1-5 income payouts",()=>{
    const plan=buildFirstTransferPayoutPlan(users[0],users,100);
    expect(plan.map(item=>[item.incomeType,item.level,item.recipient.uid,item.percentage,item.amount])).toEqual([
      ["REFERRAL_INCOME",1,"BV900001",5,5],["LEVEL_INCOME",1,"BV900001",1,1],
      ["LEVEL_INCOME",2,"BV900002",1,1],["LEVEL_INCOME",3,"BV900003",1,1],
      ["LEVEL_INCOME",4,"BV900004",1,1],["LEVEL_INCOME",5,"BV900005",1,1],
    ]);
  });
  it("calculates $50 referral plus five $10 level payouts for $1000",()=>expect(buildFirstTransferPayoutPlan(users[0],users,1000).map(item=>item.amount)).toEqual([50,10,10,10,10,10]));
  it("uses only existing real uplines",()=>expect(buildFirstTransferPayoutPlan(users[0],users.slice(0,3),500)).toHaveLength(3));
  it("pays nothing below $50",()=>expect(buildFirstTransferPayoutPlan(users[0],users,49.99)).toEqual([]));
  it("consumes a below-minimum first transfer and never qualifies the second",()=>{
    const seed=cloneWalletSeed();seed.wallets.spot.balance=600;
    const first=transferBetweenWallets(seed,"spot",40,"first",1,{sourceUserId:"source",genealogy:users.map(user=>({...user,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??""}))});
    const second=transferBetweenWallets(first,"spot",500,"second",2,{sourceUserId:"source",genealogy:users.map(user=>({...user,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??""}))});
    expect(first.referralQualification).toEqual({consumed:true,firstTransferAmount:40,qualified:false});expect(second.referralCommissions).toEqual([]);
  });
  it("returns the same wallet on retry without duplicate records",()=>{
    const seed=cloneWalletSeed();seed.wallets.spot.balance=500;
    const first=transferBetweenWallets(seed,"spot",500,"same-key",1,{sourceUserId:"source",genealogy:users.map(user=>({...user,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??""}))});
    expect(transferBetweenWallets(first,"spot",500,"same-key",2,{sourceUserId:"source",genealogy:[]})).toBe(first);
  });
  it("missing sponsor leaves the transfer eligible evaluation with no payout",()=>expect(buildFirstTransferPayoutPlan({...users[0],sponsorId:"missing"},users,500)).toEqual([]));
  it("reconciles missing Level 1-5 entries without duplicating an existing direct payout",async()=>{
    const directEntry={id:"existing-direct",distributionId:"distribution",recipientUserId:"direct",sourceReferredUserId:"source",sourceTransferId:"transfer:debit",level:0,incomeType:"REFERRAL_INCOME",percentage:5,amount:5,transactionType:"SPOT_REFERRAL_INCOME",ledgerTransactionId:"legacy-direct",createdAt:new Date()},entries=[directEntry],states=new Map(users.map(user=>{const wallet=cloneWalletSeed();wallet.totalFuturePrincipal=100;return[user.id,{wallet}] as const})),notifications:unknown[]=[],audits:unknown[]=[];
    const distribution={id:"distribution",referredUserId:"source",eventType:"FIRST_SPOT_TO_FUTURE",sourceTransferId:"transfer:debit",idempotencyKey:"key",transferAmount:100,status:"CREATED",resultCode:"DISTRIBUTION_CREATED",createdAt:new Date(),entries};
    const tx={referralDistribution:{findUnique:async()=>distribution,create:async()=>distribution,findUniqueOrThrow:async()=>distribution},userState:{findUnique:async({where}:{where:{userId:string}})=>states.get(where.userId)??null,upsert:async({where,create,update}:{where:{userId:string};create:{wallet:unknown};update:{wallet:unknown}})=>{const value={wallet:(states.has(where.userId)?update:create).wallet as ReturnType<typeof cloneWalletSeed>};states.set(where.userId,value);return value}},referralIncomeEntry:{create:async({data}:{data:Record<string,unknown>})=>{const entry={...data,id:`entry-${entries.length}`,createdAt:new Date()};entries.push(entry as typeof directEntry);return entry}},userNotification:{create:async({data}:{data:unknown})=>{notifications.push(data);return data}},referralIncomeAuditLog:{create:async({data}:{data:unknown})=>{audits.push(data);return data}}} as unknown as Prisma.TransactionClient;
    const input={source:users[0],users,amount:100,transferId:"transfer:debit",transferReference:"wallet-transfer:transfer",idempotencyKey:"transfer",timestamp:1};
    await distributeFirstSpotToFuture(tx,input);
    expect(entries.map(entry=>[entry.transactionType,entry.level,entry.amount])).toEqual([["SPOT_REFERRAL_INCOME",0,5],["SPOT_LEVEL_INCOME",1,1],["SPOT_LEVEL_INCOME",2,1],["SPOT_LEVEL_INCOME",3,1],["SPOT_LEVEL_INCOME",4,1],["SPOT_LEVEL_INCOME",5,1]]);
    expect((states.get("direct")!.wallet as ReturnType<typeof cloneWalletSeed>).wallets.spot.balance).toBe(1);
    expect(notifications).toHaveLength(5);expect(audits).toHaveLength(5);
    await distributeFirstSpotToFuture(tx,input);
    expect(entries).toHaveLength(6);expect(notifications).toHaveLength(5);expect(audits).toHaveLength(5);
  });
  it("does not commission a second qualifying Spot to Future transfer",()=>{const seed=cloneWalletSeed();seed.wallets.spot.balance=200;const first=transferBetweenWallets(seed,"spot",100,"first-qualified",1,{sourceUserId:"source",genealogy:users.map(user=>({...user,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??""}))}),second=transferBetweenWallets(first,"spot",100,"second-qualified",2,{sourceUserId:"source",genealogy:users.map(user=>({...user,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??""}))});expect(second.referralCommissions).toHaveLength(first.referralCommissions.length)});
});
