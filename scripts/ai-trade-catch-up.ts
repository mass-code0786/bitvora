import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { aiTradeScaleConfig } from "@/lib/ai-trade-scale/config";
import { creationJobKey,openDueSessions,scheduleSessionsForUser } from "@/lib/ai-trade-scale/orchestrator";
import { closeAiTradeQueues } from "@/lib/ai-trade-scale/queue";

const userArgument=process.argv.find(value=>value.startsWith("--user="))?.slice("--user=".length).trim(),apply=process.argv.includes("--apply"),dryRun=process.argv.includes("--dry-run");
async function main(){
  if(!userArgument||apply===dryRun)throw new Error("Use --user=<USER_ID_OR_EMAIL> with exactly one of --dry-run or --apply.");
  const now=new Date(),boundary=new Date(now.getTime()-aiTradeScaleConfig.AI_TRADE_CATCH_UP_HOURS*60*60_000),user=await prisma.user.findFirst({where:{OR:[{id:userArgument},{email:{equals:userArgument,mode:"insensitive"}},{uid:{equals:userArgument.toUpperCase(),mode:"insensitive"}}]},select:{id:true,uid:true,email:true,timezone:true,country:true,additionalTradeEligibility:true,aiBotSubscriptions:{where:{status:"ACTIVE",activatedAt:{lte:now},expiresAt:{gt:boundary}},select:{activatedAt:true,expiresAt:true}}}});
  if(!user)throw new Error("User not found.");
  const candidates=await Promise.all(scheduleSessionsForUser(user,now).map(async item=>{if(!item.shouldEnqueue)return{slot:item.session.sequence,due:item.due,eligible:item.subscriptionEligible&&item.additionalEligible,wouldEnqueue:false,reason:!item.due?"FUTURE_SESSION":!item.insideCatchUp?"OUTSIDE_CATCH_UP_WINDOW":!item.subscriptionEligible?"SUBSCRIPTION_NOT_ACTIVE_AT_SLOT":"ADDITIONAL_WINDOW_INELIGIBLE"};const sessionKey=`${item.session.id}:${item.session.timeZone}`,run=await prisma.tradeSessionRun.findUnique({where:{localTradingDate_sessionId_tradeType:{localTradingDate:item.session.tradingDate,sessionId:sessionKey,tradeType:"AI_BOT"}},select:{id:true,localTradingDate:true,localSessionSlot:true,tradeType:true}}),job=run?await prisma.aiTradeJob.findFirst({where:{OR:[{jobKey:creationJobKey(run,user.id)},{sessionRunId:run.id,userId:user.id,kind:"CREATE"}]},select:{status:true}}):null,trade=run?await prisma.aiFinancialTrade.findUnique({where:{userId_sessionRunId_tradeType:{userId:user.id,sessionRunId:run.id,tradeType:"AI_BOT"}},select:{status:true}}):null;return{slot:item.session.sequence,due:true,eligible:true,wouldEnqueue:!job&&!trade,reason:trade?"TRADE_EXISTS":job?`JOB_${job.status}`:"DUE_MISSING"}}));
  const result=apply?await openDueSessions(now,user.id):null;
  console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",authoritativePipelineOnly:true,user:{id:user.id,uid:user.uid,email:user.email},catchUpHours:aiTradeScaleConfig.AI_TRADE_CATCH_UP_HOURS,candidates,result},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1}).finally(async()=>{await closeAiTradeQueues().catch(()=>{});await prisma.$disconnect()});
