import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { closeAiTradeQueues } from "@/lib/ai-trade-scale/queue";
import { enqueueSettlementRecovery,loadSettlementRecoveryCandidates } from "@/lib/ai-trade-scale/settlement-recovery";

const argument=process.argv.find(value=>value.startsWith("--user="))?.slice(7).trim(),apply=process.argv.includes("--apply"),dryRun=process.argv.includes("--dry-run");
async function main(){
  if(!argument||apply===dryRun)throw new Error("Usage: npm run ai-trade:settlement-recover -- --user=<USER_ID_OR_EMAIL> (--dry-run|--apply)");
  const user=await prisma.user.findFirst({where:{OR:[{id:argument},{email:{equals:argument,mode:"insensitive"}},{uid:{equals:argument.toUpperCase(),mode:"insensitive"}}]},select:{id:true,uid:true}});
  if(!user)throw new Error("User not found.");
  const candidates=await loadSettlementRecoveryCandidates(user.id),report=[];
  for(const candidate of candidates)report.push({tradeId:candidate.trade.id,classification:candidate.classification,status:candidate.trade.status,settlementDueAt:candidate.trade.sessionRun.scheduledSettleAt,existingJobId:candidate.job?.id??null,existingBullJobId:candidate.job?.bullJobId??null,expectedBullJobId:candidate.expectedBullJobId,principalReturned:candidate.principalReturned,profitCredited:candidate.profitCredited,action:apply?await enqueueSettlementRecovery(candidate):candidate.classification==="MANUAL_REVIEW"?"WOULD_SKIP_MANUAL_REVIEW":"WOULD_ENQUEUE_SETTLEMENT"});
  console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",balancesMutated:false,user:{id:user.id,uid:user.uid},candidateCount:candidates.length,report},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1}).finally(async()=>{await closeAiTradeQueues().catch(()=>{});await prisma.$disconnect()});
