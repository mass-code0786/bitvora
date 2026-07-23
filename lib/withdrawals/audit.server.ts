import { prisma } from "@/lib/prisma";
import { getWithdrawalQueue } from "./queue.server";
export type WithdrawalClassification="CONSISTENT_PENDING"|"CONSISTENT_COMPLETED"|"QUEUED_JOB_MISSING"|"BROADCASTED_HASH_MISSING"|"HASH_EXISTS_STATUS_STALE"|"CONFIRMED_STATUS_STALE"|"DEBIT_MISSING"|"DUPLICATE_PAYOUT_RISK"|"REFUND_REQUIRED"|"MANUAL_REVIEW";
export function classifyWithdrawal(value:{status:string;txHash:string|null;confirmations:number;requiredConfirmations:number;jobs:number;debits:number;refunds:number;successfulAttempts:number}):WithdrawalClassification{
  if(!value.debits)return"DEBIT_MISSING";
  if(value.successfulAttempts>1)return"DUPLICATE_PAYOUT_RISK";
  if(value.status==="MANUAL_REVIEW")return"MANUAL_REVIEW";
  if(["QUEUED","PROCESSING","RETRYABLE_FAILED"].includes(value.status)&&!value.jobs)return"QUEUED_JOB_MISSING";
  if(["BROADCASTED","CONFIRMING","COMPLETED"].includes(value.status)&&!value.txHash)return"BROADCASTED_HASH_MISSING";
  if(value.txHash&&!["BROADCASTED","CONFIRMING","COMPLETED"].includes(value.status))return"HASH_EXISTS_STATUS_STALE";
  if(value.confirmations>=value.requiredConfirmations&&value.status!=="COMPLETED")return"CONFIRMED_STATUS_STALE";
  if(value.status==="REJECTED"&&!value.refunds)return"REFUND_REQUIRED";
  return value.status==="COMPLETED"?"CONSISTENT_COMPLETED":"CONSISTENT_PENDING";
}
export async function auditWithdrawals(where:Record<string,unknown>={}){
  const rows=await prisma.withdrawal.findMany({where,include:{user:{select:{id:true,uid:true,email:true}},jobs:true,attempts:{orderBy:{attemptNumber:"desc"}},ledger:true},orderBy:{createdAt:"desc"}}),queue=getWithdrawalQueue(),output=[];
  for(const row of rows){
    const job=row.jobs[0],bull=job?await queue.getJob(job.bullJobId):null,debits=row.ledger.filter(v=>v.operation==="DEBIT"),refunds=row.ledger.filter(v=>v.operation==="REFUND"),successful=row.attempts.filter(v=>["BROADCASTED","CONFIRMED"].includes(v.status));
    output.push({classification:classifyWithdrawal({status:row.status,txHash:row.txHash,confirmations:row.confirmations,requiredConfirmations:row.requiredConfirmations,jobs:row.jobs.length,debits:debits.length,refunds:refunds.length,successfulAttempts:successful.length}),withdrawalId:row.id,user:{id:row.user.id,uid:row.user.uid,email:row.user.email.replace(/(^.).*(@.*$)/,"$1***$2")},wallet:"SPOT",requestedAmount:row.requestedAmount.toString(),fees:{platform:row.platformFee.toString(),networkFeeAsset:row.networkFeeAsset,networkFeeBaseUnits:row.networkFeeBaseUnits.toString()},lockedOrDebitedAmount:row.debitedAmount.toString(),payoutAmount:row.recipientAmount.toString(),status:row.status,durableJob:job&&{id:job.id,status:job.status,jobKey:job.jobKey,bullJobId:job.bullJobId},bullMqState:bull?await bull.getState():null,broadcastAttempt:row.attempts[0]??null,nonce:row.attempts[0]?.nonce.toString()??null,transactionHash:row.txHash,confirmationCount:row.confirmations,debitLedger:debits[0]??null,refundLedger:refunds[0]??null});
  }return output;
}
