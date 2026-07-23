import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { createDailySessions,getTradingDate } from "@/lib/ai-trading-engine";
import { getWalletReadSnapshot } from "@/lib/future-wallet.server";
import { formatUserTimestamp,resolveUserTimeZone } from "@/lib/timezone.server";
import { aiTradeScaleConfig,queues } from "@/lib/ai-trade-scale/config";
import { closeAiTradeQueues,getRedisConnection,getTradeQueue } from "@/lib/ai-trade-scale/queue";

const argument=process.argv.find(value=>value.startsWith("--user="))?.slice("--user=".length).trim();
const bounded=<T>(operation:Promise<T>,milliseconds=5_000)=>Promise.race<T>([operation,new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error(`Timed out after ${milliseconds}ms`)),milliseconds))]);

async function main(){
  if(!argument)throw new Error("Usage: npm run ai-trade:runtime-diagnose -- --user=<USER_ID_OR_EMAIL>");
  const now=new Date(),user=await prisma.user.findFirst({where:{OR:[{id:argument},{email:{equals:argument,mode:"insensitive"}},{uid:{equals:argument.toUpperCase(),mode:"insensitive"}}]},select:{id:true,uid:true,email:true,timezone:true,country:true,aiBotSubscriptions:{where:{status:"ACTIVE",activatedAt:{lte:now},expiresAt:{gt:now}},orderBy:{activatedAt:"desc"},take:1,select:{id:true,status:true,activatedAt:true,expiresAt:true}}}});
  if(!user)throw new Error("User not found.");
  const timeZone=resolveUserTimeZone(user.timezone,user.country),nowMs=now.getTime(),tradingDate=getTradingDate(nowMs,timeZone),sessions=createDailySessions(tradingDate,nowMs,timeZone),current=sessions.find(session=>nowMs>=session.liveFrom&&nowMs<session.placementClosesAt)??null,next=sessions.find(session=>session.liveFrom>nowMs)??null,expected=current??next??sessions.at(-1)!,sessionKey=`${expected.id}:${timeZone}`;
  const wallet=await getWalletReadSnapshot(user.id),run=await prisma.tradeSessionRun.findUnique({where:{localTradingDate_sessionId_tradeType:{localTradingDate:tradingDate,sessionId:sessionKey,tradeType:"AI_BOT"}},select:{id:true,status:true,totalEligible:true,totalQueued:true,totalStarted:true,totalFailed:true,queueCompletedAt:true}}),trade=run?await prisma.aiFinancialTrade.findUnique({where:{userId_sessionRunId_tradeType:{userId:user.id,sessionRunId:run.id,tradeType:"AI_BOT"}},select:{id:true,executionKey:true,status:true,failureCode:true,createdAt:true}}):null,job=run?await prisma.aiTradeJob.findUnique({where:{jobKey:`CREATE:${run.id}:${user.id}`},select:{id:true,jobKey:true,queueName:true,status:true,attempts:true,failureCode:true,failureMessage:true,startedAt:true,completedAt:true}}):null,latestFailure=await prisma.aiTradeJob.findFirst({where:{userId:user.id,status:{in:["FAILED","DEAD"]}},orderBy:{updatedAt:"desc"},select:{jobKey:true,queueName:true,status:true,attempts:true,failureCode:true,failureMessage:true,updatedAt:true}});
  let redis:{healthy:boolean;ping?:string;error?:string}={healthy:false},queueCounts:Record<string,number>|null=null,repeatableJobs:unknown[]=[];
  try{
    const ping=await bounded(getRedisConnection().ping()),queue=getTradeQueue();
    redis={healthy:ping==="PONG",ping};
    queueCounts=await bounded(queue.getJobCounts("waiting","active","delayed","failed","completed"));
    repeatableJobs=await bounded(queue.getRepeatableJobs(0,50,true));
  }catch(error){redis={healthy:false,error:error instanceof Error?error.message:"Unknown Redis error"}}
  const blockedReason=trade?"EXISTING_TRADE":job?`JOB_${job.status}`:!user.aiBotSubscriptions[0]?"BOT_INACTIVE":!wallet.authoritativeReady?wallet.missingWallet?"RELATIONAL_WALLET_MISSING":"OPENING_LEDGER_MISSING":!wallet.availableFuture.isPositive()?"INSUFFICIENT_AUTHORITATIVE_FUTURE":!current?"NO_CURRENTLY_LIVE_SESSION":!redis.healthy?"REDIS_UNAVAILABLE":"NOT_ENQUEUED";
  console.log(JSON.stringify({readOnly:true,currentUtc:now.toISOString(),user:{id:user.id,uid:user.uid,email:user.email,storedTimezone:user.timezone,resolvedTimezone:timeZone,currentLocalTime:formatUserTimestamp(now,timeZone).localDateTime},expectedSession:{status:current?"LIVE":next?"UPCOMING":"ENDED",slot:expected.sequence,tradingDate,sessionId:expected.id,sessionKey,liveFromUtc:new Date(expected.liveFrom).toISOString(),liveFromLocal:formatUserTimestamp(expected.liveFrom,timeZone).localDateTime,placementClosesAtUtc:new Date(expected.placementClosesAt).toISOString()},activeAiBotSubscription:user.aiBotSubscriptions[0]??null,authoritativeFutureWallet:{ready:wallet.authoritativeReady,source:wallet.source,availableFuture:wallet.availableFuture.toString(),missingWallet:wallet.missingWallet,missingOpeningLedger:wallet.missingOpeningLedger},eligibility:{eligible:Boolean(current&&user.aiBotSubscriptions[0]&&wallet.authoritativeReady&&wallet.availableFuture.isPositive()),blockedReason},redis:{urlConfigured:Boolean(process.env.REDIS_URL),queueNames:queues,...redis},tradeQueue:{counts:queueCounts,repeatableJobs},sessionRun:run,existingTrade:trade,creationJob:job,latestWorkerError:latestFailure,legacyNewTradesEnabled:process.env.LEGACY_AI_TRADE_ALLOW_NEW==="YES",config:{queueConcurrency:aiTradeScaleConfig.AI_TRADE_QUEUE_CONCURRENCY,maxRetries:aiTradeScaleConfig.AI_TRADE_MAX_RETRIES}},null,2));
}

main().catch(error=>{console.error(JSON.stringify({readOnly:true,error:error instanceof Error?error.message:"Unknown diagnostic failure"},null,2));process.exitCode=1}).finally(async()=>{await closeAiTradeQueues().catch(()=>{});await prisma.$disconnect()});
