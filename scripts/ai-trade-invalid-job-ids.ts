import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { createBullJobId,settlementBullJobId } from "@/lib/ai-trade-scale/orchestrator";

const sanitize=(value:string|null)=>value===null?null:value.length<=24?value:`${value.slice(0,12)}…${value.slice(-8)}`;
async function main(){
  const rows=await prisma.aiTradeJob.findMany({where:{bullJobId:{contains:":"}},include:{sessionRun:{select:{localTradingDate:true,localSessionSlot:true,tradeType:true}}},orderBy:{createdAt:"desc"}});
  const status={QUEUED:0,FAILED:0,PROCESSING:0,COMPLETED:0,other:0},kind={CREATE:0,SETTLE:0,other:0};
  for(const row of rows){
    if(row.status==="QUEUED")status.QUEUED++;else if(row.status==="FAILED")status.FAILED++;else if(row.status==="RUNNING")status.PROCESSING++;else if(row.status==="COMPLETED")status.COMPLETED++;else status.other++;
    if(row.kind==="CREATE")kind.CREATE++;else if(row.kind==="SETTLE")kind.SETTLE++;else kind.other++;
  }
  const expected=(row:(typeof rows)[number])=>row.kind==="CREATE"&&row.userId?createBullJobId({...row.sessionRun,id:row.sessionRunId},row.userId):row.kind==="SETTLE"&&row.tradeId?settlementBullJobId(row.tradeId):null;
  const recoveryAction=(row:(typeof rows)[number])=>row.kind==="CREATE"&&row.userId?"REGENERATE":row.bullJobId?"REUSE_STORED_BULL_JOB_ID":"DERIVE_FROM_JOB_KEY";
  const staleReusedByRecovery=rows.filter(row=>row.status==="QUEUED"&&!(row.kind==="CREATE"&&row.userId)&&Boolean(row.bullJobId)).length;
  console.log(JSON.stringify({readOnly:true,totalInvalid:rows.length,statusBreakdown:status,kindBreakdown:kind,recoveryCurrentlyReusesStoredInvalid:staleReusedByRecovery>0,recoveryRowsReusingStoredInvalid:staleReusedByRecovery,samples:rows.slice(0,20).map(row=>({id:sanitize(row.id),kind:row.kind,status:row.status,jobKey:sanitize(row.jobKey),bullJobId:sanitize(row.bullJobId),containsColon:Boolean(row.bullJobId?.includes(":")),expectedBullJobId:sanitize(expected(row)),recoveryAction:recoveryAction(row),recoveryWouldReuseStoredBullJobId:recoveryAction(row)==="REUSE_STORED_BULL_JOB_ID",recoveryWouldRegenerate:recoveryAction(row)==="REGENERATE"}))},null,2));
}
main().catch(error=>{console.error(JSON.stringify({readOnly:true,error:error instanceof Error?error.message:"Unknown diagnostic error"}));process.exitCode=1}).finally(()=>prisma.$disconnect());
