import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/nowpayments/client.server";
import { analyzeProviderPayment } from "@/lib/nowpayments/deposit-service.server";
import { findDepositByPaymentId } from "@/lib/nowpayments/deposit-store.server";
import { migrateWalletStore } from "@/lib/wallet-data";

export function paymentIdArg(){
  const value=process.argv.find(item=>item.startsWith("--paymentId="))?.slice("--paymentId=".length).trim();
  if(!value||!/^[A-Za-z0-9_-]{3,160}$/.test(value))throw new Error("Pass a valid --paymentId=<PAYMENT_ID>.");
  return value;
}
export const maskAddress=(value:string)=>value.length<14?"[redacted]":`${value.slice(0,8)}…${value.slice(-6)}`;
export async function inspectDeposit(paymentId:string){
  const local=await findDepositByPaymentId(paymentId);
  if(!local)throw new Error("Local deposit not found.");
  if(local.mock)throw new Error("Recovery diagnostics only support real provider payments.");
  const provider=await getPaymentStatus(paymentId),analysis=analyzeProviderPayment(local,provider);
  const state=await prisma.userState.findUnique({where:{userId:local.userId},select:{wallet:true}});
  const wallet=state?migrateWalletStore(state.wallet):null,key=`NOWPAYMENTS_DEPOSIT_CREDIT:${paymentId}`;
  const ledgerEntryExists=Boolean(wallet?.processedKeys.includes(key)||wallet?.transactions.some(item=>item.id===`${key}:credit`));
  const reason=local.walletCreditCompleted?"Already credited; no recovery is needed.":analysis.reviewReason??(!analysis.confirmed?"Provider payment is not yet confirmed.":analysis.withinTolerance!==true?"Confirmed amount is outside tolerance.":"Provider-confirmed payment is eligible for the atomic credit path.");
  return{local,provider,analysis,ledgerEntryExists,reason};
}
export function reportDiagnostic(result:Awaited<ReturnType<typeof inspectDeposit>>){
  const{local,provider,analysis}=result;
  return{
    localUserId:local.userId,
    localPaymentId:local.providerPaymentId,
    requestedAmount:String(local.requestedAmount),
    storedProviderPayAmount:String(local.payAmount),
    storedAddress:maskAddress(local.payAddress),
    providerStatus:String(provider.payment_status),
    providerAddress:maskAddress(String(provider.pay_address??"")),
    providerPayAmount:String(provider.pay_amount??"missing"),
    confirmedReceivedAmount:analysis.received?.toString()??"missing",
    normalizedAddressMatch:analysis.addressMatch,
    withinTolerance:analysis.withinTolerance,
    walletCreditCompleted:local.walletCreditCompleted===true,
    creditedAt:local.creditedAt?new Date(local.creditedAt).toISOString():null,
    ledgerEntryExists:result.ledgerEntryExists,
    reasonCreditDidNotOccur:result.reason
  };
}
