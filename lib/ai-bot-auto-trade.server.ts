import { Prisma } from "@prisma/client";
import { addTargetCompletedNotification, createDailySessions, FIRST_DEPOSIT_BONUS_MS, getSessionById, getSessionPhase, getTradingDate, migrateTradingStore, placeUserTrade, settleUserTrade, syncAdditionalEligibility } from "@/lib/ai-trading-engine";
import { tradingPlan } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getFutureMetrics, lockFutureTradeCapital, migrateWalletStore, settleFutureTrade } from "@/lib/wallet-data";
import { resolveUserTimeZone } from "@/lib/timezone.server";

export const AI_BOT_WORKER_INTERVAL_MS=5_000;
export const AI_BOT_MISSED_GRACE_MS=60_000;
export const botExecutionKey=(userId:string,tradingDate:string,sessionId:string)=>`${userId}:${tradingDate}:${sessionId}:AI_BOT`;
export type BotExecutionResult={joined:boolean;reason:"PLACED"|"ALREADY_JOINED"|"BOT_INACTIVE"|"SESSION_NOT_FOUND"|"SESSION_NOT_LIVE"|"NOT_ELIGIBLE"|"INSUFFICIENT_BALANCE"|"ACCOUNT_STATE_UNAVAILABLE"|"LEGACY_DISABLED";tradeId?:string;executionKey?:string};

class BotSkip extends Error{constructor(public reason:BotExecutionResult["reason"]){super(reason)}}
const uniqueConflict=(error:unknown)=>error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002";

export async function executeAiBotSession(userId:string,sessionId:string,now=Date.now()):Promise<BotExecutionResult>{
  if(process.env.LEGACY_AI_TRADE_ALLOW_NEW!=="YES")return{joined:false,reason:"LEGACY_DISABLED"};
  try{return await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "UserState" WHERE "userId"=${userId} FOR UPDATE`;
    const user=await tx.user.findUnique({where:{id:userId},select:{id:true,uid:true,timezone:true,country:true,state:{select:{wallet:true,trading:true}}}});if(!user?.state)throw new BotSkip("ACCOUNT_STATE_UNAVAILABLE");
    const timeZone=resolveUserTimeZone(user.timezone,user.country),session=getSessionById(sessionId,now,timeZone);if(!session)throw new BotSkip("SESSION_NOT_FOUND");if(getSessionPhase(session,now)!=="LIVE")throw new BotSkip("SESSION_NOT_LIVE");
    const subscription=await tx.aiBotSubscription.findFirst({where:{userId,status:"ACTIVE",activatedAt:{lte:new Date(now)},expiresAt:{gt:new Date(now)}},orderBy:{activatedAt:"desc"}});if(!subscription||session.liveFrom>=subscription.expiresAt.getTime())throw new BotSkip("BOT_INACTIVE");
    const wallet=migrateWalletStore(user.state.wallet),baseTrading=migrateTradingStore(user.state.trading),firstDeposit=session.type==="ADDITIONAL"?await tx.nowPaymentsDeposit.findFirst({where:{userId,credited:true,confirmedAt:{not:null},usdtAmount:{gte:tradingPlan.workingPlan}},select:{confirmedAt:true},orderBy:{confirmedAt:"asc"}}):null,additionalEligible=Boolean(firstDeposit?.confirmedAt&&session.liveFrom>=firstDeposit.confirmedAt.getTime()&&session.liveFrom<firstDeposit.confirmedAt.getTime()+FIRST_DEPOSIT_BONUS_MS),trading=session.type==="ADDITIONAL"?syncAdditionalEligibility(baseTrading,session.tradingDate,additionalEligible):baseTrading;
    if(session.type==="ADDITIONAL"&&!additionalEligible)throw new BotSkip("NOT_ELIGIBLE");
    if(trading.trades.some(item=>item.userId===userId&&item.sessionId===session.id))throw new BotSkip("ALREADY_JOINED");
    if(wallet.wallets.future.balance<=0)throw new BotSkip("INSUFFICIENT_BALANCE");
    let placed;try{placed=placeUserTrade({store:trading,session,userId,userUid:user.uid,futureBalance:wallet.wallets.future.balance,now,placementSource:"AI_BOT"})}catch(error){if(error instanceof Error&&/insufficient/i.test(error.message))throw new BotSkip("INSUFFICIENT_BALANCE");if(error instanceof Error&&/not available/i.test(error.message))throw new BotSkip("NOT_ELIGIBLE");throw error}
    const executionKey=botExecutionKey(userId,session.tradingDate,session.id),trade=placed.trade,details={userUid:user.uid,tradeId:trade.id,sessionId:session.id,pair:session.pair,direction:trade.direction,source:"AI_BOT" as const,grossFutureBalance:trade.balanceSnapshot,tradeCapital:trade.tradeCapital,profitPercentage:trade.profitRate,profitAmount:trade.profitAmount},nextWallet=lockFutureTradeCapital(wallet,trade.tradeCapital,trade.idempotencyKey,details,now);
    await tx.aiBotTradeExecution.create({data:{executionKey,userId,subscriptionId:subscription.id,tradingDate:session.tradingDate,sessionId:session.id,timeZone,tradeType:"AI_BOT",tradeId:trade.id,status:"PLACED",placedAt:new Date(now)}});
    await tx.userState.update({where:{userId},data:{wallet:nextWallet as object,trading:placed.store as object}});
    return{joined:true,reason:"PLACED",tradeId:trade.id,executionKey};
  },{isolationLevel:"Serializable"})}catch(error){if(error instanceof BotSkip)return{joined:false,reason:error.reason};if(uniqueConflict(error)){const tradingDate=/^AI_SESSION:(\d{4}-\d{2}-\d{2}):/.exec(sessionId)?.[1]??"unknown",executionKey=botExecutionKey(userId,tradingDate,sessionId),existing=await prisma.aiBotTradeExecution.findUnique({where:{executionKey}});return{joined:false,reason:"ALREADY_JOINED",tradeId:existing?.tradeId,executionKey:existing?.executionKey??executionKey}}throw error}
}

export async function settleAiBotExecution(executionId:string,now=Date.now()){
  return prisma.$transaction(async tx=>{
    const initial=await tx.aiBotTradeExecution.findUnique({where:{id:executionId}});if(!initial||initial.status==="SETTLED")return{settled:false,reason:"ALREADY_SETTLED" as const};
    await tx.$queryRaw`SELECT "id" FROM "UserState" WHERE "userId"=${initial.userId} FOR UPDATE`;
    const[state,user]=await Promise.all([tx.userState.findUnique({where:{userId:initial.userId}}),tx.user.findUnique({where:{id:initial.userId},select:{uid:true}})]);if(!state||!user)return{settled:false,reason:"ACCOUNT_STATE_UNAVAILABLE" as const};
    const session=getSessionById(initial.sessionId,now,initial.timeZone);if(!session||now<session.settlesAt)return{settled:false,reason:"NOT_DUE" as const};
    let wallet=migrateWalletStore(state.wallet),trading=migrateTradingStore(state.trading);const trade=trading.trades.find(item=>item.id===initial.tradeId);if(!trade)return{settled:false,reason:"TRADE_NOT_FOUND" as const};if(trade.status==="SETTLED"){await tx.aiBotTradeExecution.update({where:{id:initial.id},data:{status:"SETTLED",settledAt:new Date(trade.settledAt??session.settlesAt)}});return{settled:false,reason:"ALREADY_SETTLED" as const}}
    const before=getFutureMetrics(wallet),key=`AI_SETTLE:${trade.id}`,details={userUid:user.uid,tradeId:trade.id,sessionId:session.id,pair:session.pair,direction:trade.direction,source:trade.placementSource,grossFutureBalance:trade.balanceSnapshot,tradeCapital:trade.tradeCapital,profitPercentage:trade.profitRate,profitAmount:trade.profitAmount};wallet=settleFutureTrade(wallet,{capital:trade.tradeCapital,profit:trade.profitAmount,key,additional:session.type==="ADDITIONAL",details,timestamp:session.settlesAt});trading=settleUserTrade(trading,trade.id,session,now).store;if(!before.futureToSpotUnlocked&&before.totalCompletedTradingProfit+trade.profitAmount>=before.requiredProfitForUnlock)trading=addTargetCompletedNotification(trading,initial.userId,session.settlesAt);
    await tx.userState.update({where:{userId:initial.userId},data:{wallet:wallet as object,trading:trading as object}});await tx.aiBotTradeExecution.update({where:{id:initial.id},data:{status:"SETTLED",settledAt:new Date(session.settlesAt)}});return{settled:true,reason:"SETTLED" as const,tradeId:trade.id}
  },{isolationLevel:"Serializable"})
}

export async function runAiBotWorkerCycle(now=Date.now()){
  const dueSettlements=await prisma.aiBotTradeExecution.findMany({where:{status:"PLACED"},select:{id:true}});for(const item of dueSettlements)await settleAiBotExecution(item.id,now).catch(error=>console.error("[ai-bot-worker] settlement_failed",{executionId:item.id,error:error instanceof Error?error.message:"unknown"}));
  const subscriptions=await prisma.aiBotSubscription.findMany({where:{status:"ACTIVE",activatedAt:{lte:new Date(now)},expiresAt:{gt:new Date(now)}},orderBy:{activatedAt:"desc"},select:{userId:true,user:{select:{timezone:true,country:true}}}}),users=new Map(subscriptions.map(item=>[item.userId,item]));let placed=0,dueSessionsChecked=0;
  for(const[userId,item]of users){const timeZone=resolveUserTimeZone(item.user.timezone,item.user.country),tradingDate=getTradingDate(now,timeZone),live=createDailySessions(tradingDate,now,timeZone).filter(session=>getSessionPhase(session,now)==="LIVE");dueSessionsChecked+=live.length;for(const session of live){const result=await executeAiBotSession(userId,session.id,now).catch(error=>{console.error("[ai-bot-worker] placement_failed",{userId,sessionId:session.id,error:error instanceof Error?error.message:"unknown"});return null});if(result?.joined)placed++}}
  return{activeUsers:users.size,dueSessionsChecked,placed,settlementsChecked:dueSettlements.length}
}
