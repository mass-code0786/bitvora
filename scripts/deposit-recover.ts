import { settleProviderPayment } from "@/lib/nowpayments/deposit-service.server";
import { inspectDeposit, paymentIdArg, reportDiagnostic } from "./deposit-diagnostic.shared";

async function main(){
  const paymentId=paymentIdArg(),apply=process.argv.includes("--apply"),dryRun=process.argv.includes("--dry-run");
  if(apply===dryRun)throw new Error("Pass exactly one mode: --dry-run or --apply.");
  const inspected=await inspectDeposit(paymentId);
  console.log(JSON.stringify({mode:apply?"apply":"dry-run",...reportDiagnostic(inspected),action:inspected.local.walletCreditCompleted?"none (already credited)":inspected.analysis.reviewReason?"mark review required":inspected.analysis.confirmed&&inspected.analysis.withinTolerance===true?"atomically credit confirmed received amount":"update pending provider state without credit"},null,2));
  if(!apply)return;
  const result=await settleProviderPayment(inspected.local,inspected.provider);
  console.log(JSON.stringify({result:"completed",walletCreditCompleted:result.walletCreditCompleted===true,creditedAmount:String(result.amountCredited),creditedAt:result.creditedAt?new Date(result.creditedAt).toISOString():null},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Deposit recovery failed.");process.exitCode=1});
