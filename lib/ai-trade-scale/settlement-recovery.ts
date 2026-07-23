import { prisma } from "@/lib/prisma";
import { queues } from "./config";
import { boundedQueueOperation,getSettlementQueue,jobOptions } from "./queue";
import { settlementBullJobId } from "./orchestrator";

const returnKey=(tradeId:string)=>`TRADE_PRINCIPAL_RETURN:${tradeId}`;
const profitKey=(tradeId:string)=>`TRADE_PROFIT:${tradeId}`;

export type SettlementRecoveryClassification="OVERDUE_SETTLEMENT"|"SETTLED_STATUS_STALE"|"MANUAL_REVIEW";

export function classifySettlementRecovery(value:{principalReturned:boolean;profitCredited:boolean;jobStatus:string|null}):SettlementRecoveryClassification{
  if(value.principalReturned!==value.profitCredited)return"MANUAL_REVIEW";
  if(value.jobStatus==="COMPLETED"&&!value.principalReturned)return"MANUAL_REVIEW";
  return value.principalReturned?"SETTLED_STATUS_STALE":"OVERDUE_SETTLEMENT";
}

export async function loadSettlementRecoveryCandidates(userId?:string,now=new Date()){
  const trades=await prisma.aiFinancialTrade.findMany({where:{...(userId?{userId}:{}),status:{in:["LOCKED","SETTLING"]},sessionRun:{scheduledSettleAt:{lte:now}}},include:{sessionRun:true},orderBy:{createdAt:"asc"},take:500});
  return Promise.all(trades.map(async trade=>{
    const[principalReturn,profitCredit,job]=await Promise.all([
      prisma.aiWalletLedger.findUnique({where:{idempotencyKey:returnKey(trade.id)},select:{id:true}}),
      prisma.aiWalletLedger.findUnique({where:{idempotencyKey:profitKey(trade.id)},select:{id:true}}),
      prisma.aiTradeJob.findUnique({where:{jobKey:`SETTLE:${trade.id}`}})
    ]);
    const principalReturned=Boolean(principalReturn),profitCredited=Boolean(profitCredit),classification=classifySettlementRecovery({principalReturned,profitCredited,jobStatus:job?.status??null});
    return{trade,principalReturn,profitCredit,job,principalReturned,profitCredited,classification,expectedBullJobId:settlementBullJobId(trade.id)};
  }));
}

export async function recoverOverdueSettlementJobs(now=new Date()){
  const candidates=await loadSettlementRecoveryCandidates(undefined,now),results=[];
  for(const candidate of candidates)results.push(await enqueueSettlementRecovery(candidate));
  return{examined:candidates.length,results};
}

export async function enqueueSettlementRecovery(candidate:Awaited<ReturnType<typeof loadSettlementRecoveryCandidates>>[number]){
  if(candidate.classification==="MANUAL_REVIEW")return{action:"SKIPPED_MANUAL_REVIEW" as const};
  const trade=candidate.trade,bullJobId=settlementBullJobId(trade.id),queue=getSettlementQueue(),existing=await queue.getJob(bullJobId),existingState=existing?await existing.getState():null;
  if(existingState==="completed")return{action:"SKIPPED_COMPLETED_BULL_JOB" as const,bullJobId,state:existingState};
  if(existingState&&["waiting","active","delayed","waiting-children","prioritized"].includes(existingState))return{action:"ALREADY_ENQUEUED" as const,dbJobId:candidate.job?.id??null,bullJobId,state:existingState};
  const dbJob=await prisma.aiTradeJob.upsert({where:{jobKey:`SETTLE:${trade.id}`},create:{jobKey:`SETTLE:${trade.id}`,bullJobId,queueName:queues.settlement,sessionRunId:trade.sessionRunId,userId:trade.userId,tradeId:trade.id,kind:"SETTLE"},update:{bullJobId,queueName:queues.settlement,status:"QUEUED",failureCode:null,failureMessage:null},select:{id:true}});
  if(existing&&existingState==="failed"){await existing.retry();return{action:"RETRIED_FAILED_BULL_JOB" as const,dbJobId:dbJob.id,bullJobId,state:existingState}}
  await boundedQueueOperation(queue.add("settle-trade",{dbJobId:dbJob.id,tradeId:trade.id},{...jobOptions,jobId:bullJobId}));
  return{action:"ENQUEUED" as const,dbJobId:dbJob.id,bullJobId};
}
