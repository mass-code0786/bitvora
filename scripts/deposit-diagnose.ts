import { inspectDeposit, paymentIdArg, reportDiagnostic } from "./deposit-diagnostic.shared";

async function main(){console.log(JSON.stringify(reportDiagnostic(await inspectDeposit(paymentIdArg())),null,2))}
main().catch(error=>{console.error(error instanceof Error?error.message:"Deposit diagnostic failed.");process.exitCode=1});
