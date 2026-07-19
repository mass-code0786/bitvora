import { beforeEach, describe, expect, it, vi } from "vitest";
import { cloneWalletSeed, creditAiBotSponsorIncome, creditSpotDeposit, type WalletStore } from "@/lib/wallet-data";

const mocks=vi.hoisted(()=>({auth:vi.fn(),transaction:vi.fn()}));
vi.mock("@/lib/auth/server",()=>({requireAuthenticatedUser:mocks.auth}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction,aiBotSubscription:{updateMany:vi.fn(),findFirst:vi.fn()},user:{findUnique:vi.fn().mockResolvedValue({timezone:"Asia/Kolkata",country:"India"})}}}));
import { POST } from "@/app/api/ai-bot/route";

const request=(key:string)=>new Request("http://localhost/api/ai-bot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idempotencyKey:key})});
const subscription={id:"subscription-1",userId:"buyer",price:10,status:"ACTIVE",activatedAt:new Date(),expiresAt:new Date(Date.now()+10000),purchaseTransactionId:"purchase",createdAt:new Date(),updatedAt:new Date()};
const income={id:"income-1",sponsorUserId:"sponsor",buyerUserId:"buyer",botSubscriptionId:"subscription-1",botPurchaseTransactionId:"purchase",purchaseAmount:10,percentage:10,commissionAmount:1,ledgerTransactionId:"ledger",status:"COMPLETED",createdAt:new Date()};

function funded(amount:number,userId:string){return amount>0?creditSpotDeposit(cloneWalletSeed(),{key:`fund-${userId}`,userId,amount,title:"Fund",reference:"fund",timestamp:1}):cloneWalletSeed()}
function transaction(options:{sponsor?:boolean;buyerBalance?:number;duplicate?:boolean}={}){
  const buyerWallet=funded(options.buyerBalance??20,"buyer"),sponsorWallet=funded(5,"sponsor"),upserts:WalletStore[]=[];
  const tx={
    aiBotSubscription:{findUnique:vi.fn().mockResolvedValue(options.duplicate?subscription:null),updateMany:vi.fn(),findFirst:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue(subscription)},
    aiBotSponsorIncome:{findUnique:vi.fn().mockResolvedValue(options.duplicate&&options.sponsor!==false?income:null),create:vi.fn().mockResolvedValue(income)},
    aiBotSponsorIncomeAuditLog:{create:vi.fn()},
    user:{findUnique:vi.fn().mockResolvedValue({id:"buyer",uid:"BV100001",sponsor:options.sponsor===false?null:{id:"sponsor",uid:"BV100002"}})},
    userState:{findUnique:vi.fn().mockImplementation(({where}:{where:{userId:string}})=>Promise.resolve({wallet:where.userId==="buyer"?buyerWallet:sponsorWallet})),upsert:vi.fn().mockImplementation(({create,update}:{create:{wallet:WalletStore};update:{wallet:WalletStore}})=>{const wallet=update.wallet??create.wallet;upserts.push(wallet);return Promise.resolve({wallet})})},
    userNotification:{create:vi.fn()},
  };
  return{tx,upserts};
}

describe("AI Bot direct sponsor income",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({id:"buyer",uid:"BV100001"})});

  it("credits exactly 10% to only the PostgreSQL direct sponsor with ledger, history, notification, and audit",async()=>{
    const{tx,upserts}=transaction({sponsor:true});mocks.transaction.mockImplementation(async callback=>callback(tx));
    const response=await POST(request("purchase-0001")),body=await response.json(),sponsorStored=upserts[1];
    expect({status:response.status,body}).toMatchObject({status:200,body:{resultCode:"AI_BOT_SPONSOR_INCOME_CREATED"}});
    expect(sponsorStored.wallets.spot.balance).toBe(6);
    expect(sponsorStored.transactions).toEqual(expect.arrayContaining([expect.objectContaining({type:"AI_BOT_SPONSOR_INCOME",amount:1})]));
    expect(sponsorStored.transactions.some(item=>item.type==="SPOT_LEVEL_INCOME"||item.type==="SPOT_REFERRAL_INCOME")).toBe(false);
    expect(tx.aiBotSponsorIncome.create).toHaveBeenCalledWith({data:expect.objectContaining({sponsorUserId:"sponsor",buyerUserId:"buyer",botSubscriptionId:"subscription-1",percentage:expect.anything(),commissionAmount:expect.anything(),status:"COMPLETED"})});
    expect(tx.userNotification.create).toHaveBeenCalledTimes(2);expect(tx.aiBotSponsorIncomeAuditLog.create).toHaveBeenCalledOnce();
  });

  it("completes the purchase without commission when no valid sponsor exists",async()=>{
    const{tx,upserts}=transaction({sponsor:false});mocks.transaction.mockImplementation(async callback=>callback(tx));
    const response=await POST(request("purchase-0002")),body=await response.json();
    expect({status:response.status,body}).toMatchObject({status:200,body:{resultCode:"AI_BOT_SPONSOR_NOT_FOUND"}});expect(upserts).toHaveLength(1);expect(tx.aiBotSponsorIncome.create).not.toHaveBeenCalled();expect(tx.aiBotSponsorIncomeAuditLog.create).not.toHaveBeenCalled();
  });

  it("does not create any payout when the buyer has insufficient Spot funds",async()=>{
    const{tx}=transaction({sponsor:true,buyerBalance:0});mocks.transaction.mockImplementation(async callback=>callback(tx));
    const response=await POST(request("purchase-0003"));expect(response.status).toBe(409);expect(tx.aiBotSubscription.create).not.toHaveBeenCalled();expect(tx.aiBotSponsorIncome.create).not.toHaveBeenCalled();
  });

  it("returns the existing payout on retry without duplicating any record",async()=>{
    const{tx}=transaction({sponsor:true,duplicate:true});mocks.transaction.mockImplementation(async callback=>callback(tx));
    const response=await POST(request("purchase-0004")),body=await response.json();expect(response.status).toBe(200);expect(body.alreadyProcessed).toBe(true);expect(body.resultCode).toBe("AI_BOT_SPONSOR_INCOME_ALREADY_PAID");expect(tx.userState.upsert).not.toHaveBeenCalled();expect(tx.userNotification.create).not.toHaveBeenCalled();expect(tx.aiBotSponsorIncome.create).not.toHaveBeenCalled();
  });

  it("allows a genuine renewal key to create a separate commission ledger",()=>{
    const first=creditAiBotSponsorIncome(cloneWalletSeed(),{key:"purchase-1:AI_BOT_SPONSOR_INCOME",sponsorUserId:"sponsor",buyerUid:"BV100001",subscriptionId:"sub-1",purchaseTransactionId:"purchase-1",purchaseAmount:10,percentage:10,commissionAmount:1,timestamp:1}),second=creditAiBotSponsorIncome(first,{key:"purchase-2:AI_BOT_SPONSOR_INCOME",sponsorUserId:"sponsor",buyerUid:"BV100001",subscriptionId:"sub-2",purchaseTransactionId:"purchase-2",purchaseAmount:10,percentage:10,commissionAmount:1,timestamp:2});
    expect(second.wallets.spot.balance).toBe(2);expect(second.transactions.filter(item=>item.type==="AI_BOT_SPONSOR_INCOME")).toHaveLength(2);
  });
});
