import { createProductionSigner } from "@/lib/withdrawals/signer.server";
import { reconcileWithdrawal } from "@/lib/withdrawals/processor.server";
import { withdrawalConfig } from "@/lib/withdrawals/config.server";
import { prisma } from "@/lib/prisma";

async function main(){
  const config=withdrawalConfig();if(config.WITHDRAWAL_AUTOMATION_ENABLED!=="true")throw new Error("Withdrawal automation is disabled.");const signer=await createProductionSigner();
  const cycle=async()=>{const rows=await prisma.withdrawal.findMany({where:{status:{in:["BROADCASTED","CONFIRMING"]}},select:{id:true},take:100});for(const row of rows)await reconcileWithdrawal(row.id,signer)};
  await cycle();const timer=setInterval(()=>void cycle().catch(error=>console.error(JSON.stringify({event:"withdrawal_confirmation_failed",errorCode:error instanceof Error?error.name:"UNKNOWN"}))),config.WITHDRAWAL_CONFIRMATION_POLL_MS);
  const stop=async()=>{clearInterval(timer);await prisma.$disconnect();process.exit(0)};process.on("SIGINT",()=>void stop());process.on("SIGTERM",()=>void stop());
}
main().catch(async error=>{console.error(JSON.stringify({event:"withdrawal_confirmation_worker_failed",errorCode:error instanceof Error?error.name:"UNKNOWN"}));await prisma.$disconnect();process.exit(1)});
