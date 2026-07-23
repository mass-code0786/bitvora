import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore,type WalletStore } from "@/lib/wallet-data";
import { withPostgresSerializationRetry } from "@/lib/ai-trade-scale/serialization-retry";
import { withdrawalLog } from "./log.server";

export class WithdrawalAdminError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}
const txHashPattern=/^0x[0-9a-fA-F]{64}$/;
export async function approveAdminWithdrawal(withdrawalId:string,adminId:string,txHash:string,targetStatus:"BROADCASTED"|"COMPLETED"){
  if(!txHashPattern.test(txHash))throw new WithdrawalAdminError("INVALID_TX_HASH","Enter a valid EVM transaction hash.");
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Withdrawal" WHERE id=${withdrawalId} FOR UPDATE`;
    const value=await tx.withdrawal.findUniqueOrThrow({where:{id:withdrawalId}});
    if(value.processingMode!=="ADMIN_FALLBACK")throw new WithdrawalAdminError("WRONG_PROCESSING_MODE","This withdrawal is not admin-controlled.",409);
    if(value.txHash){if(value.txHash.toLowerCase()===txHash.toLowerCase())return value;throw new WithdrawalAdminError("TX_HASH_EXISTS","A different transaction hash is already stored.",409)}
    if(value.status!=="PENDING_ADMIN_REVIEW")throw new WithdrawalAdminError("INVALID_STATE","This withdrawal can no longer be approved.",409);
    const now=new Date(),updated=await tx.withdrawal.update({where:{id:withdrawalId},data:{status:targetStatus,txHash,reviewedByAdminId:adminId,approvedAt:now,broadcastedAt:now,...(targetStatus==="COMPLETED"?{confirmedAt:now,completedAt:now,confirmations:value.requiredConfirmations}:{})}});
    await tx.withdrawalAdminAudit.create({data:{withdrawalId,adminId,action:"APPROVED",previousStatus:value.status,nextStatus:targetStatus,txHash}});
    return updated;
  },{isolationLevel:"Serializable"});
}
export async function rejectAdminWithdrawal(withdrawalId:string,adminId:string,reason:string){
  const rejectionReason=reason.trim();if(rejectionReason.length<3)throw new WithdrawalAdminError("REASON_REQUIRED","A rejection reason is required.");
  const result=await withPostgresSerializationRetry(()=>prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Withdrawal" WHERE id=${withdrawalId} FOR UPDATE`;
    const value=await tx.withdrawal.findUniqueOrThrow({where:{id:withdrawalId}});
    if(value.processingMode!=="ADMIN_FALLBACK")throw new WithdrawalAdminError("WRONG_PROCESSING_MODE","This withdrawal is not admin-controlled.",409);
    if(value.status==="REJECTED"){const refund=await tx.withdrawalLedger.findUnique({where:{idempotencyKey:value.refundIdempotencyKey}});if(refund)return value}
    if(value.status!=="PENDING_ADMIN_REVIEW"||value.txHash)throw new WithdrawalAdminError("INVALID_STATE","This withdrawal can no longer be rejected.",409);
    await tx.$queryRaw`SELECT id FROM "UserState" WHERE "userId"=${value.userId} FOR UPDATE`;
    const existing=await tx.withdrawalLedger.findUnique({where:{idempotencyKey:value.refundIdempotencyKey}}),state=await tx.userState.findUniqueOrThrow({where:{userId:value.userId}});
    if(!existing){const wallet=migrateWalletStore(state.wallet),before=new Prisma.Decimal(String(wallet.wallets.spot.balance)),after=before.add(value.debitedAmount),next:WalletStore={...wallet,wallets:{...wallet.wallets,spot:{...wallet.wallets.spot,balance:Number(after.toString())}},processedKeys:[value.refundIdempotencyKey,...wallet.processedKeys]};await tx.withdrawalLedger.create({data:{withdrawalId,userId:value.userId,idempotencyKey:value.refundIdempotencyKey,operation:"REFUND",amount:value.debitedAmount,balanceBefore:before,balanceAfter:after}});await tx.userState.update({where:{userId:value.userId},data:{wallet:next as unknown as Prisma.InputJsonValue}})}
    const updated=await tx.withdrawal.update({where:{id:withdrawalId},data:{status:"REJECTED",reviewedByAdminId:adminId,rejectedAt:new Date(),rejectionReason}});
    await tx.withdrawalAdminAudit.create({data:{withdrawalId,adminId,action:"REJECTED",previousStatus:value.status,nextStatus:"REJECTED",reason:rejectionReason}});
    return updated;
  },{isolationLevel:"Serializable"}),{context:"WITHDRAWAL_ADMIN_REJECTION"});
  withdrawalLog("withdrawal_refunded",{withdrawalId,reason:"ADMIN_REJECTED"});return result;
}
