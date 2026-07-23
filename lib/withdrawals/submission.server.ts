import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { withPostgresSerializationRetry } from "@/lib/ai-trade-scale/serialization-retry";
import { cloneWalletSeed,FIXED_WITHDRAWAL_FEE,migrateWalletStore,requestSpotWithdrawal } from "@/lib/wallet-data";
import { blockedAddresses,withdrawalConfig } from "./config.server";
import { withdrawalBullJobId,enqueueWithdrawalJob } from "./queue.server";
import { normalizeEvmAddress } from "./address.server";
import { withdrawalLog } from "./log.server";
import { automaticWithdrawalAvailable } from "./mode.server";
import { resolveUserTimeZone } from "@/lib/timezone.server";
import { getTradingDate } from "@/lib/ai-trading-engine";

export class WithdrawalRequestError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}
const decimal=(value:number|string)=>new Prisma.Decimal(String(value));
const dayStart=()=>{const value=new Date();value.setUTCHours(0,0,0,0);return value};
export type WithdrawalSubmission={amount:number;network:"BEP20";address:string;clientRequestId:string};

export async function createWithdrawal(userId:string,input:WithdrawalSubmission){
  const config=withdrawalConfig();
  let destinationAddress:string;
  try{destinationAddress=normalizeEvmAddress(input.address)}catch{throw new WithdrawalRequestError("INVALID_ADDRESS","Invalid BEP20 destination address.")}
  if(blockedAddresses().has(destinationAddress.toLowerCase()))throw new WithdrawalRequestError("BLOCKED_DESTINATION","This destination cannot receive withdrawals.",403);
  const requested=decimal(input.amount),minimum=decimal(Math.max(10,config.AUTO_WITHDRAW_MIN_AMOUNT)),fee=decimal(FIXED_WITHDRAWAL_FEE),recipient=requested.sub(fee);
  if(requested.lt(minimum))throw new WithdrawalRequestError("BELOW_MINIMUM",`Minimum withdrawal amount is $${minimum.toString()}.`);
  if(recipient.lte(0))throw new WithdrawalRequestError("INVALID_PAYOUT","Withdrawal payout must be greater than zero after fees.");
  const existing=await prisma.withdrawal.findUnique({where:{userId_clientRequestId:{userId,clientRequestId:input.clientRequestId}}});
  if(existing)return existing;
  const automatic=await automaticWithdrawalAvailable(),now=new Date();
  const withdrawalId=randomUUID(),requestKey=`WITHDRAWAL_REQUEST:${userId}:${input.clientRequestId}`,debitKey=`WITHDRAWAL_DEBIT:${withdrawalId}`,payoutKey=`WITHDRAWAL_PAYOUT:${withdrawalId}`,refundKey=`WITHDRAWAL_REFUND:${withdrawalId}`,bullJobId=withdrawalBullJobId(withdrawalId);
  const result=await withPostgresSerializationRetry(()=>prisma.$transaction(async tx=>{
    const duplicate=await tx.withdrawal.findUnique({where:{userId_clientRequestId:{userId,clientRequestId:input.clientRequestId}}});if(duplicate)return duplicate;
    await tx.$queryRaw`SELECT id FROM "UserState" WHERE "userId"=${userId} FOR UPDATE`;
    const [account,state,userDaily,globalDaily]=await Promise.all([
      tx.user.findUniqueOrThrow({where:{id:userId},select:{withdrawalsSuspended:true,timezone:true,country:true}}),
      tx.userState.findUnique({where:{userId}}),
      tx.withdrawal.aggregate({where:{userId,createdAt:{gte:dayStart()},status:{notIn:["REJECTED","CANCELLED"]}},_sum:{requestedAmount:true}}),
      tx.withdrawal.aggregate({where:{createdAt:{gte:dayStart()},status:{notIn:["CANCELLED"]}},_sum:{requestedAmount:true}})
    ]);
    if(account.withdrawalsSuspended)throw new WithdrawalRequestError("ACCOUNT_SUSPENDED","Withdrawals are suspended for this account.",403);
    const wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),balance=decimal(wallet.wallets.spot.balance);
    if(requested.gt(balance))throw new WithdrawalRequestError("INSUFFICIENT_BALANCE","Insufficient Spot Wallet balance.",409);
    const timeZone=resolveUserTimeZone(account.timezone,account.country),userLocalDate=getTradingDate(now.getTime(),timeZone),dailyKey=`WITHDRAWAL_DAILY:${userId}:${userLocalDate}`,dailyExisting=await tx.withdrawal.findUnique({where:{dailyKey}});
    if(dailyExisting)throw new WithdrawalRequestError("DAILY_WITHDRAWAL_LIMIT","You can submit only one withdrawal per day. Please try again tomorrow.",409);
    const reasons=[
      requested.gt(config.AUTO_WITHDRAW_MAX_PER_TX)?"PER_TRANSACTION_LIMIT":null,
      decimal(userDaily._sum.requestedAmount?.toString()??0).add(requested).gt(config.AUTO_WITHDRAW_MAX_PER_USER_DAILY)?"USER_DAILY_LIMIT":null,
      decimal(globalDaily._sum.requestedAmount?.toString()??0).add(requested).gt(config.AUTO_WITHDRAW_MAX_GLOBAL_DAILY)?"GLOBAL_DAILY_LIMIT":null
    ].filter(Boolean) as string[],status=reasons.length?"MANUAL_REVIEW" as const:automatic?"QUEUED" as const:"PENDING_ADMIN_REVIEW" as const,processingMode=automatic?"AUTOMATIC":"ADMIN_FALLBACK";
    const next=requestSpotWithdrawal(wallet,{key:requestKey,userId,amount:Number(requested.toString()),network:"BEP20",address:destinationAddress,timestamp:Date.now()});
    const withdrawal=await tx.withdrawal.create({data:{id:withdrawalId,userId,clientRequestId:input.clientRequestId,dailyKey,userLocalDate,userTimeZone:timeZone,processingMode,requestIdempotencyKey:requestKey,debitIdempotencyKey:debitKey,payoutIdempotencyKey:payoutKey,refundIdempotencyKey:refundKey,network:config.WITHDRAWAL_NETWORK,chainId:config.WITHDRAWAL_CHAIN_ID,tokenContract:normalizeEvmAddress(config.WITHDRAWAL_TOKEN_CONTRACT),tokenDecimals:config.WITHDRAWAL_TOKEN_DECIMALS,destinationAddress,requestedAmount:requested,platformFee:fee,recipientAmount:recipient,debitedAmount:requested,status,requiredConfirmations:config.WITHDRAWAL_REQUIRED_CONFIRMATIONS,riskReason:reasons.join(",")||null}});
    await tx.withdrawalLedger.create({data:{withdrawalId,userId,idempotencyKey:debitKey,operation:"DEBIT",amount:requested.negated(),balanceBefore:balance,balanceAfter:balance.sub(requested)}});
    if(status==="QUEUED")await tx.withdrawalJob.create({data:{withdrawalId,kind:"PAYOUT",jobKey:payoutKey,bullJobId}});
    await tx.userState.upsert({where:{userId},create:{userId,wallet:next as unknown as Prisma.InputJsonValue,trading:createEmptyTradingStore() as unknown as Prisma.InputJsonValue},update:{wallet:next as unknown as Prisma.InputJsonValue}});
    return withdrawal;
  },{isolationLevel:"Serializable"}),{context:"WITHDRAWAL_SUBMISSION"}).catch(async error=>{if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){const duplicate=await prisma.withdrawal.findUnique({where:{userId_clientRequestId:{userId,clientRequestId:input.clientRequestId}}});if(duplicate)return duplicate;throw new WithdrawalRequestError("DAILY_WITHDRAWAL_LIMIT","You can submit only one withdrawal per day. Please try again tomorrow.",409)}throw error});
  withdrawalLog("withdrawal_requested",{withdrawalId:result.id,userId,network:result.network,amount:result.requestedAmount.toString()});
  withdrawalLog("withdrawal_funds_locked",{withdrawalId:result.id,userId,network:result.network,amount:result.debitedAmount.toString()});
  if(result.status==="QUEUED"){
    const job=await prisma.withdrawalJob.findUniqueOrThrow({where:{jobKey:payoutKey}});
    try{await enqueueWithdrawalJob(job);await prisma.withdrawalJob.update({where:{id:job.id},data:{status:"ENQUEUED"}});withdrawalLog("withdrawal_job_enqueued",{withdrawalId:result.id,userId,network:result.network,amount:result.recipientAmount.toString()})}
    catch(error){withdrawalLog("withdrawal_retry_scheduled",{withdrawalId:result.id,userId,network:result.network,amount:result.recipientAmount.toString(),errorCode:error instanceof Error?error.name:"QUEUE_ERROR"})}
  }else withdrawalLog("withdrawal_manual_review",{withdrawalId:result.id,userId,network:result.network,amount:result.requestedAmount.toString(),reason:result.riskReason});
  return result;
}

export async function recoverPendingWithdrawalJobs(){
  const jobs=await prisma.withdrawalJob.findMany({where:{status:{in:["PENDING","RETRYABLE_FAILED"]},OR:[{nextAttemptAt:null},{nextAttemptAt:{lte:new Date()}}]},take:100});
  for(const job of jobs){await enqueueWithdrawalJob(job);await prisma.withdrawalJob.update({where:{id:job.id},data:{status:"ENQUEUED",lastErrorCode:null}})}
  return jobs.length;
}
