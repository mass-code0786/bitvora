import { prisma } from "@/lib/prisma";
import { creditAiProfit,lockFutureWallet,lockTradePrincipal,reconcileLegacyMirror,returnTradePrincipal } from "@/lib/future-wallet.server";
import { calculatePrincipal,calculateProfit,existingProfitRate,TRADE_PERCENTAGE } from "./amount";
import { TradeJobError } from "./errors";

const lockKey=(id:string)=>`TRADE_LOCK:${id}`;
const returnKey=(id:string)=>`TRADE_PRINCIPAL_RETURN:${id}`;
const profitKey=(id:string)=>`TRADE_PROFIT:${id}`;

export async function createTradeForUser(sessionRunId:string,userId:string){return prisma.$transaction(async tx=>{
  const run=await tx.tradeSessionRun.findUniqueOrThrow({where:{id:sessionRunId}});
  const subscription=run.tradeType==="AI_BOT"?await tx.aiBotSubscription.findFirst({where:{userId,status:"ACTIVE",activatedAt:{lte:run.scheduledStartAt},expiresAt:{gt:run.scheduledStartAt}},orderBy:{activatedAt:"desc"},select:{id:true}}):null;
  if(run.tradeType==="AI_BOT"&&!subscription)throw new TradeJobError("SUBSCRIPTION_EXPIRED",false);
  const user=await tx.user.findUniqueOrThrow({where:{id:userId},select:{uid:true}}),wallet=await lockFutureWallet(tx,userId),executionKey=`${userId}:${run.localTradingDate}:${run.sessionId}:${run.tradeType}`;
  const duplicate=await tx.aiFinancialTrade.findUnique({where:{executionKey}});if(duplicate)return duplicate;
  const principal=calculatePrincipal(wallet.availableFuture),rate=existingProfitRate(user.uid,run.localTradingDate,run.sessionType==="ADDITIONAL"?"ADDITIONAL":"REGULAR"),profit=calculateProfit(wallet.availableFuture,rate),tradeId=crypto.randomUUID();
  const trade=await tx.aiFinancialTrade.create({data:{id:tradeId,executionKey,sessionRunId,userId,subscriptionId:subscription?.id,tradeType:run.tradeType,placementSource:run.tradeType==="MANUAL"?"MANUAL":"AI_BOT",userTimeZone:run.timeZone,localTradingDate:run.localTradingDate,localSessionSlot:run.localSessionSlot,balanceSnapshot:wallet.availableFuture,tradePercentage:TRADE_PERCENTAGE,principal,profitRate:rate,profit,status:"LOCKED",officialStartedAt:run.scheduledStartAt}});
  await lockTradePrincipal(tx,{userId,tradeId:trade.id,amount:principal,idempotencyKey:lockKey(trade.id),officialAt:run.scheduledStartAt});await reconcileLegacyMirror(tx,userId);
  await tx.aiOutboxEvent.create({data:{idempotencyKey:`TRADE_NOTIFICATION:${trade.id}:STARTED`,aggregateType:"TRADE",aggregateId:trade.id,userId,eventType:"TRADE_STARTED",payload:{tradeId:trade.id,sessionRunId}}});await tx.tradeSessionRun.update({where:{id:sessionRunId},data:{totalStarted:{increment:1}}});return trade;
 },{isolationLevel:"Serializable",timeout:10_000,maxWait:5_000})}

export async function settleTrade(tradeId:string){return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "AiFinancialTrade" WHERE "id"=${tradeId} FOR UPDATE`;
  const trade=await tx.aiFinancialTrade.findUnique({where:{id:tradeId},include:{sessionRun:true}});if(!trade)throw new TradeJobError("PERMANENT_VALIDATION",false,"Trade not found");if(trade.status==="SETTLED")return trade;
  const wallet=await lockFutureWallet(tx,trade.userId);if(wallet.lockedFuture.lt(trade.principal))throw new TradeJobError("PERMANENT_VALIDATION",false,"Locked principal invariant failed");
  const principalExists=await tx.aiWalletLedger.findUnique({where:{idempotencyKey:returnKey(trade.id)}}),profitExists=await tx.aiWalletLedger.findUnique({where:{idempotencyKey:profitKey(trade.id)}});if(principalExists||profitExists)throw new TradeJobError("PERMANENT_VALIDATION",false,"Partial settlement ledger detected; reconciliation required");
  const officialAt=trade.sessionRun.officialSettledAt,beforeProfit=wallet.completedProfit;await returnTradePrincipal(tx,{userId:trade.userId,tradeId:trade.id,amount:trade.principal,idempotencyKey:returnKey(trade.id),officialAt});await creditAiProfit(tx,{userId:trade.userId,tradeId:trade.id,amount:trade.profit,idempotencyKey:profitKey(trade.id),officialAt});
  const settled=await tx.aiFinancialTrade.update({where:{id:trade.id},data:{status:"SETTLED",officialSettledAt:officialAt,processingSettledAt:new Date()}}),target=wallet.retainedPrincipal.mul("0.70");await reconcileLegacyMirror(tx,trade.userId);
  await tx.aiOutboxEvent.createMany({data:[{idempotencyKey:`TRADE_NOTIFICATION:${trade.id}:SETTLED`,aggregateType:"TRADE",aggregateId:trade.id,userId:trade.userId,eventType:"TRADE_SETTLED",payload:{tradeId:trade.id,officialSettledAt:officialAt.toISOString()}},{idempotencyKey:`TRADE_NOTIFICATION:${trade.id}:PROFIT`,aggregateType:"TRADE",aggregateId:trade.id,userId:trade.userId,eventType:"PROFIT_CREDITED",payload:{tradeId:trade.id,amount:trade.profit.toString()}},...(target.isPositive()&&beforeProfit.lt(target)&&beforeProfit.add(trade.profit).gte(target)?[{idempotencyKey:`AI_PROFIT_TARGET_REACHED:${trade.userId}:70_PERCENT_V1`,aggregateType:"WALLET",aggregateId:trade.userId,userId:trade.userId,eventType:"AI_PROFIT_TARGET_REACHED",payload:{targetVersion:"70_PERCENT_V1"}}]:[])],skipDuplicates:true});await tx.tradeSessionRun.update({where:{id:trade.sessionRunId},data:{totalSettled:{increment:1}}});return settled;
 },{isolationLevel:"Serializable",timeout:10_000,maxWait:5_000})}
