import { Worker } from "bullmq";
import { createProductionSigner } from "@/lib/withdrawals/signer.server";
import { getWithdrawalRedis,withdrawalQueueName } from "@/lib/withdrawals/queue.server";
import { processWithdrawal } from "@/lib/withdrawals/processor.server";
import { recoverPendingWithdrawalJobs } from "@/lib/withdrawals/submission.server";
import { withdrawalConfig } from "@/lib/withdrawals/config.server";
import { prisma } from "@/lib/prisma";
import { clearSignerHeartbeat,recordSignerHeartbeat } from "@/lib/withdrawals/mode.server";

async function main(){
  const config=withdrawalConfig();
  if(config.WITHDRAWAL_AUTOMATION_ENABLED!=="true")throw new Error("Withdrawal automation is disabled. Set WITHDRAWAL_AUTOMATION_ENABLED=true only after production audit and limited-value testing.");
  const signer=await createProductionSigner();
  const signerAddress=await signer.getAddress();await recordSignerHeartbeat(signerAddress);
  await recoverPendingWithdrawalJobs();
  const worker=new Worker(withdrawalQueueName,async job=>processWithdrawal(String(job.data.dbJobId),signer),{connection:getWithdrawalRedis(),concurrency:config.WITHDRAWAL_WORKER_CONCURRENCY});
  const timer=setInterval(()=>void Promise.all([recoverPendingWithdrawalJobs(),recordSignerHeartbeat(signerAddress)]).catch(error=>console.error(JSON.stringify({event:"withdrawal_recovery_failed",errorCode:error instanceof Error?error.name:"UNKNOWN"}))),30000);
  const stop=async()=>{clearInterval(timer);await clearSignerHeartbeat().catch(()=>undefined);await worker.close();await prisma.$disconnect();process.exit(0)};
  process.on("SIGINT",()=>void stop());process.on("SIGTERM",()=>void stop());
}
main().catch(async error=>{console.error(JSON.stringify({event:"withdrawal_worker_failed",errorCode:error instanceof Error?error.name:"UNKNOWN",message:error instanceof Error?error.message:"Worker failed"}));await prisma.$disconnect();process.exit(1)});
