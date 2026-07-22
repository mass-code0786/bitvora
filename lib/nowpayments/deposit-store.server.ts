import "server-only";
import { prisma } from "@/lib/prisma";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, creditNowPaymentsDeposit, migrateWalletStore } from "@/lib/wallet-data";
import { publicDepositStatus, type DepositPaymentStatus } from "./config";
import type { DemoDepositRecord } from "./deposit-types";

const toRecord=(row:{id:string;paymentId:string;userId:string;orderId:string;idempotencyKey:string;usdtAmount:{toNumber():number};requestedAmount:{toNumber():number};walletAddress:string;txHash:string|null;status:string;providerStatus:string;credited:boolean;expiresAt:Date|null;confirmedAt:Date|null;createdAt:Date;updatedAt:Date;user:{uid:string}}):DemoDepositRecord=>({
  id:row.id,userId:row.userId,userUid:row.user.uid,provider:"NOWPAYMENTS",providerPaymentId:row.paymentId,orderId:row.orderId,
  requestedAmount:row.requestedAmount.toNumber(),payAmount:row.usdtAmount.toNumber(),payCurrency:"usdtbsc",network:"USDT_BEP20",
  payAddress:row.walletAddress,paymentStatus:row.providerStatus as DepositPaymentStatus,actuallyPaid:row.credited?row.usdtAmount.toNumber():0,
  amountCredited:row.credited?row.usdtAmount.toNumber():0,creditStatus:row.credited?"CREDITED":"NOT_CREDITED",txHash:row.txHash,
  idempotencyKey:row.idempotencyKey,createdAt:row.createdAt.getTime(),updatedAt:row.updatedAt.getTime(),finishedAt:row.confirmedAt?.getTime()??null,
  expiresAt:row.expiresAt?.getTime()??null,mock:false,status:row.status as DemoDepositRecord["status"]
});
const include={user:{select:{uid:true}}} as const;
const testRecords:DemoDepositRecord[]=[];
const testMode=()=>process.env.NODE_ENV==="test"&&!process.env.DATABASE_URL;
export async function listServerDeposits(userId?:string){if(testMode())return testRecords.filter(record=>!userId||record.userId===userId).sort((a,b)=>b.createdAt-a.createdAt);return(await prisma.nowPaymentsDeposit.findMany({where:userId?{userId}:undefined,include,orderBy:{createdAt:"desc"}})).map(toRecord)}
export async function findDepositByPaymentId(paymentId:string){if(testMode())return testRecords.find(record=>record.providerPaymentId===paymentId)??null;const row=await prisma.nowPaymentsDeposit.findUnique({where:{paymentId},include});return row?toRecord(row):null}
export async function findDepositByIdempotency(userId:string,key:string){if(testMode())return testRecords.find(record=>record.userId===userId&&record.idempotencyKey===key)??null;const row=await prisma.nowPaymentsDeposit.findUnique({where:{userId_idempotencyKey:{userId,idempotencyKey:key}},include});return row?toRecord(row):null}
export async function saveServerDeposit(record:DemoDepositRecord){if(testMode()){const index=testRecords.findIndex(item=>item.id===record.id);if(index>=0)testRecords[index]=record;else testRecords.push(record);return record}const row=await prisma.nowPaymentsDeposit.upsert({where:{paymentId:record.providerPaymentId},create:{id:record.id,paymentId:record.providerPaymentId,userId:record.userId,orderId:record.orderId,idempotencyKey:record.idempotencyKey,usdtAmount:record.payAmount,requestedAmount:record.requestedAmount,walletAddress:record.payAddress,txHash:record.txHash,status:publicDepositStatus(record.paymentStatus),providerStatus:record.paymentStatus,expiresAt:record.expiresAt?new Date(record.expiresAt):null,confirmedAt:record.finishedAt?new Date(record.finishedAt):null,createdAt:new Date(record.createdAt)},update:{usdtAmount:record.payAmount,txHash:record.txHash,status:publicDepositStatus(record.paymentStatus),providerStatus:record.paymentStatus,expiresAt:record.expiresAt?new Date(record.expiresAt):null,confirmedAt:record.finishedAt?new Date(record.finishedAt):null},include});return toRecord(row)}

export async function saveReconciledDeposit(record:DemoDepositRecord){
  if(testMode())return saveServerDeposit({...record,status:publicDepositStatus(record.paymentStatus)});
  return prisma.$transaction(async tx=>{
    const existing=await tx.nowPaymentsDeposit.findUniqueOrThrow({where:{paymentId:record.providerPaymentId},include});
    if(existing.credited)return toRecord(existing);
    const completed=record.paymentStatus==="FINISHED"&&record.creditStatus==="CREDITED";
    await tx.nowPaymentsDeposit.update({where:{paymentId:record.providerPaymentId},data:{txHash:record.txHash,status:publicDepositStatus(record.paymentStatus),providerStatus:record.paymentStatus,expiresAt:record.expiresAt?new Date(record.expiresAt):null,confirmedAt:completed?new Date(record.finishedAt??Date.now()):null}});
    if(completed){
      const claim=await tx.nowPaymentsDeposit.updateMany({where:{paymentId:record.providerPaymentId,credited:false},data:{credited:true}});
      if(claim.count===1){
        const state=await tx.userState.findUnique({where:{userId:record.userId}}),wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),next=creditNowPaymentsDeposit(wallet,{providerPaymentId:record.providerPaymentId,orderId:record.orderId,network:"BEP20",amount:record.amountCredited,txHash:record.txHash,timestamp:record.finishedAt??Date.now()});
        await tx.userState.upsert({where:{userId:record.userId},create:{userId:record.userId,wallet:next as object,trading:createEmptyTradingStore() as object},update:{wallet:next as object}});
      }
    }
    const row=await tx.nowPaymentsDeposit.findUniqueOrThrow({where:{paymentId:record.providerPaymentId},include});return toRecord(row);
  });
}
