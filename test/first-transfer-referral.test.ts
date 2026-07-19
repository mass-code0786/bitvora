import { describe, expect, it } from "vitest";
import { buildFirstTransferPayoutPlan } from "@/lib/referral/first-transfer.server";
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
  it("calculates $25 direct and five real $5 upline payouts",()=>{
    const plan=buildFirstTransferPayoutPlan(users[0],users,500);
    expect(plan.map(item=>[item.level,item.percentage,item.amount])).toEqual([[0,5,25],[1,1,5],[2,1,5],[3,1,5],[4,1,5],[5,1,5]]);
  });
  it("uses only existing real uplines",()=>expect(buildFirstTransferPayoutPlan(users[0],users.slice(0,3),500)).toHaveLength(2));
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
});
