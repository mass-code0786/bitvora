import { prisma } from "@/lib/prisma";
import { auditWithdrawals } from "@/lib/withdrawals/audit.server";
import { closeWithdrawalQueue,enqueueWithdrawalJob } from "@/lib/withdrawals/queue.server";
const apply=process.argv.includes("--apply");if(apply&&process.argv.includes("--dry-run"))throw new Error("Choose --dry-run or --apply, not both.");
async function main(){
  type Action={withdrawalId:string;action:string;job?:{id:string;status:string;jobKey:string;bullJobId:string}|null};
  const rows=await auditWithdrawals(),actions:Action[]=rows.flatMap(row=>{
    if(row.classification==="HASH_EXISTS_STATUS_STALE")return[{withdrawalId:row.withdrawalId,action:"SET_CONFIRMING_FROM_EXISTING_HASH"}];
    if(row.classification==="CONFIRMED_STATUS_STALE")return[{withdrawalId:row.withdrawalId,action:"SET_COMPLETED_FROM_PERSISTED_CONFIRMATIONS"}];
    if(row.classification==="CONSISTENT_PENDING"&&row.durableJob&&["PENDING","RETRYABLE_FAILED"].includes(row.durableJob.status))return[{withdrawalId:row.withdrawalId,action:"REENQUEUE_EXISTING_DURABLE_JOB",job:row.durableJob}];
    return[];
  });
  console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",actions},null,2));if(!apply)return;
  for(const action of actions){
    if(action.action==="SET_CONFIRMING_FROM_EXISTING_HASH")await prisma.withdrawal.update({where:{id:action.withdrawalId},data:{status:"CONFIRMING"}});
    else if(action.action==="SET_COMPLETED_FROM_PERSISTED_CONFIRMATIONS")await prisma.withdrawal.update({where:{id:action.withdrawalId},data:{status:"COMPLETED",completedAt:new Date()}});
    else if(action.job){await enqueueWithdrawalJob({id:action.job.id,withdrawalId:action.withdrawalId,bullJobId:action.job.bullJobId});await prisma.withdrawalJob.update({where:{id:action.job.id},data:{status:"ENQUEUED"}})}
  }
}
main().finally(async()=>{await closeWithdrawalQueue();await prisma.$disconnect()});
