import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDailySessions,getSessionById,getTradingDate,type TradeSession } from "@/lib/ai-trading-engine";
import { resolveUserTimeZone } from "@/lib/timezone.server";
import { aiTradeScaleConfig,queues } from "./config";
import { getTradeQueue,jobOptions,settlementQueue } from "./queue";
import { isAdditionalTradeEligible } from "./eligibility";

const slot=(session:TradeSession)=>String(session.sequence);
const runSessionKey=(session:TradeSession)=>`${session.id}:${session.timeZone}`;
const resultRate=(session:TradeSession)=>{const hash=[...runSessionKey(session)].reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619)>>>0,2166136261);return session.type==="ADDITIONAL"?new Prisma.Decimal(40+(hash%11)).div(100):new Prisma.Decimal(100+(hash%101)).div(100).div(3).toDecimalPlaces(6)};

async function ensureRun(session:TradeSession,tradeType="AI_BOT"){
  return prisma.tradeSessionRun.upsert({where:{localTradingDate_sessionId_tradeType:{localTradingDate:session.tradingDate,sessionId:runSessionKey(session),tradeType}},create:{sessionId:runSessionKey(session),localTradingDate:session.tradingDate,tradeType,sessionType:session.type,localSessionSlot:slot(session),timeZone:session.timeZone,scheduledStartAt:new Date(session.liveFrom),referencePriceAt:new Date(session.liveFrom),scheduledSettleAt:new Date(session.settlesAt),officialSettledAt:new Date(session.settlesAt),pair:session.pair,direction:session.signalDirection,profitRate:resultRate(session),resultSource:`EXISTING_DETERMINISTIC_RULE:${runSessionKey(session)}`},update:{},select:{id:true,status:true,localTradingDate:true,sessionId:true}})
}

async function enqueueUser(runId:string,userId:string){
  const tradeQueue=getTradeQueue();
  const jobKey=`CREATE:${runId}:${userId}`,existing=await prisma.aiTradeJob.findUnique({where:{jobKey},select:{id:true,status:true}});if(existing){if(existing.status==="QUEUED")await tradeQueue.add("create-trade",{dbJobId:existing.id,sessionRunId:runId,userId},{...jobOptions,jobId:jobKey});return false}
  const dbJob=await prisma.aiTradeJob.create({data:{jobKey,queueName:queues.trade,sessionRunId:runId,userId,kind:"CREATE"},select:{id:true}});await tradeQueue.add("create-trade",{dbJobId:dbJob.id,sessionRunId:runId,userId},{...jobOptions,jobId:jobKey});return true
}

export async function enqueueEligible(sessionRunId:string,eligibleAt:Date){
  const run=await prisma.tradeSessionRun.findUniqueOrThrow({where:{id:sessionRunId}});let cursor:string|undefined,total=0;
  for(;;){const rows=await prisma.user.findMany({where:{timezone:run.timeZone,aiBotSubscriptions:{some:{status:"ACTIVE",activatedAt:{lte:eligibleAt},expiresAt:{gt:eligibleAt}}},...(run.sessionType==="ADDITIONAL"?{additionalTradeEligibility:{is:{eligible:true,eligibilityStartedAt:{lte:eligibleAt},eligibilityEndsAt:{gt:eligibleAt}}}}:{})},orderBy:{id:"asc"},take:aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE,...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true}});if(!rows.length)break;for(const row of rows){if(await enqueueUser(run.id,row.id))total++}cursor=rows.at(-1)!.id;if(rows.length<aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE)break}
  const counts=await prisma.aiTradeJob.count({where:{sessionRunId,kind:"CREATE"}});await prisma.tradeSessionRun.update({where:{id:sessionRunId},data:{totalEligible:counts,totalQueued:counts,status:"RUNNING",queueCompletedAt:new Date()}});return total
}

export async function openDueSessions(now=new Date()){
  let cursor:string|undefined;const touched=new Set<string>();
  for(;;){const users=await prisma.user.findMany({where:{aiBotSubscriptions:{some:{status:"ACTIVE",activatedAt:{lte:now},expiresAt:{gt:now}}}},orderBy:{id:"asc"},take:aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE,...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,timezone:true,country:true,additionalTradeEligibility:true}});if(!users.length)break;
    for(const user of users){const timeZone=resolveUserTimeZone(user.timezone,user.country),date=getTradingDate(now.getTime(),timeZone),live=createDailySessions(date,now.getTime(),timeZone).filter(session=>now.getTime()>=session.liveFrom&&now.getTime()<session.placementClosesAt);for(const session of live){if(session.type==="ADDITIONAL"&&!isAdditionalTradeEligible(user.additionalTradeEligibility,session.liveFrom))continue;const run=await ensureRun(session);if(run.status!=="QUEUING")continue;if(await enqueueUser(run.id,user.id))touched.add(run.id)}}
    cursor=users.at(-1)!.id;if(users.length<aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE)break
  }
  for(const id of touched){const count=await prisma.aiTradeJob.count({where:{sessionRunId:id,kind:"CREATE"}});await prisma.tradeSessionRun.update({where:{id},data:{totalEligible:count,totalQueued:count,status:"RUNNING",queueCompletedAt:new Date()}})}
}

export async function enqueueUserSessionTrade(userId:string,sessionId:string,tradeType:"AI_BOT"|"MANUAL",now=new Date()){
  const user=await prisma.user.findUniqueOrThrow({where:{id:userId},select:{timezone:true,country:true,additionalTradeEligibility:true}}),timeZone=resolveUserTimeZone(user.timezone,user.country),session=getSessionById(sessionId,now.getTime(),timeZone);if(!session||now.getTime()<session.liveFrom||now.getTime()>=session.placementClosesAt)throw new Error("SESSION_NOT_LIVE");
  if(session.type==="ADDITIONAL"){const value=user.additionalTradeEligibility;if(!(value?.eligible&&value.eligibilityStartedAt.getTime()<=session.liveFrom&&value.eligibilityEndsAt&&value.eligibilityEndsAt.getTime()>session.liveFrom))throw new Error("NOT_ELIGIBLE")}
  const run=await ensureRun(session,tradeType);await enqueueUser(run.id,userId);const count=await prisma.aiTradeJob.count({where:{sessionRunId:run.id,kind:"CREATE"}});await prisma.tradeSessionRun.update({where:{id:run.id},data:{totalEligible:count,totalQueued:count,status:"RUNNING",queueCompletedAt:new Date()}});return run
}

export async function enqueueDueSettlements(now=new Date()){const runs=await prisma.tradeSessionRun.findMany({where:{status:{in:["RUNNING","PARTIAL_FAILURE"]},scheduledSettleAt:{lte:now}},select:{id:true}});for(const run of runs){await prisma.tradeSessionRun.update({where:{id:run.id},data:{status:"SETTLING"}});let cursor:string|undefined;for(;;){const trades=await prisma.aiFinancialTrade.findMany({where:{sessionRunId:run.id,status:{in:["LOCKED","SETTLING"]}},orderBy:{id:"asc"},take:aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE,...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,userId:true}});if(!trades.length)break;for(const trade of trades){const jobKey=`SETTLE:${trade.id}`,dbJob=await prisma.aiTradeJob.upsert({where:{jobKey},create:{jobKey,queueName:queues.settlement,sessionRunId:run.id,userId:trade.userId,tradeId:trade.id,kind:"SETTLE"},update:{},select:{id:true,status:true}});if(dbJob.status==="QUEUED")await settlementQueue.add("settle-trade",{dbJobId:dbJob.id,tradeId:trade.id},{...jobOptions,jobId:jobKey})}cursor=trades.at(-1)!.id;if(trades.length<aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE)break}}}
export async function recoverQueuedJobs(){const jobs=await prisma.aiTradeJob.findMany({where:{status:"QUEUED"},take:aiTradeScaleConfig.AI_TRADE_ENQUEUE_BATCH_SIZE,orderBy:{id:"asc"}});for(const job of jobs){const queue=job.kind==="CREATE"?getTradeQueue():settlementQueue;await queue.add(job.kind==="CREATE"?"create-trade":"settle-trade",job.kind==="CREATE"?{dbJobId:job.id,sessionRunId:job.sessionRunId,userId:job.userId}:{dbJobId:job.id,tradeId:job.tradeId},{...jobOptions,jobId:job.jobKey})}}
export async function finalizeSessions(){const runs=await prisma.tradeSessionRun.findMany({where:{status:{in:["SETTLING","PARTIAL_FAILURE"]}},select:{id:true,totalEligible:true}});for(const run of runs){const[pending,dead,trades,settled]=await Promise.all([prisma.aiTradeJob.count({where:{sessionRunId:run.id,status:{in:["QUEUED","RUNNING","FAILED"]}}}),prisma.aiTradeJob.count({where:{sessionRunId:run.id,status:"DEAD"}}),prisma.aiFinancialTrade.count({where:{sessionRunId:run.id}}),prisma.aiFinancialTrade.count({where:{sessionRunId:run.id,status:"SETTLED"}})]);if(pending===0&&dead===0&&trades===run.totalEligible&&settled===trades)await prisma.tradeSessionRun.update({where:{id:run.id},data:{status:"COMPLETED",completedAt:new Date()}});else if(dead>0)await prisma.tradeSessionRun.update({where:{id:run.id},data:{status:"PARTIAL_FAILURE"}})}}
