import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore,type WalletStore } from "@/lib/wallet-data";
import { withdrawalConfig } from "./config.server";
import { withdrawalAmountBaseUnits,type WithdrawalSigner } from "./signer.server";
import { withdrawalLog } from "./log.server";
import { withPostgresSerializationRetry } from "@/lib/ai-trade-scale/serialization-retry";

const retryDelay=(attempt:number)=>Math.min(15*60_000,1000*2**Math.max(0,attempt-1)+Math.floor(Math.random()*1000));
const transient=(error:unknown)=>error instanceof Error&&/timeout|429|temporar|network|ECONN|SERVER_ERROR|liquidity/i.test(error.message);
export const nextSafeNonce=(pendingNonce:number,highestReservedNonce:bigint|null)=>Math.max(pendingNonce,highestReservedNonce===null?pendingNonce:Number(highestReservedNonce)+1);
export const mayBroadcastWithdrawal=(value:{status:string;txHash?:string|null;signedTransactionHash?:string|null})=>["QUEUED","RETRYABLE_FAILED","PROCESSING"].includes(value.status)&&!value.txHash&&!value.signedTransactionHash;
async function retryOrReview(jobId:string,withdrawalId:string,error:unknown){
  const job=await prisma.withdrawalJob.findUniqueOrThrow({where:{id:jobId}}),attempts=job.attempts+1,config=withdrawalConfig(),retry=transient(error)&&attempts<config.WITHDRAWAL_MAX_ATTEMPTS;
  await prisma.$transaction([
    prisma.withdrawalJob.update({where:{id:jobId},data:{attempts,status:retry?"RETRYABLE_FAILED":"MANUAL_REVIEW",lastErrorCode:error instanceof Error?error.name:"UNKNOWN",nextAttemptAt:retry?new Date(Date.now()+retryDelay(attempts)):null}}),
    prisma.withdrawal.update({where:{id:withdrawalId},data:{status:retry?"RETRYABLE_FAILED":"MANUAL_REVIEW",failureCode:error instanceof Error?error.name:"UNKNOWN",failureMessage:error instanceof Error?error.message.slice(0,300):"Unknown payout failure"}})
  ]);
  withdrawalLog(retry?"withdrawal_retry_scheduled":"withdrawal_manual_review",{withdrawalId,attempt:attempts,errorCode:error instanceof Error?error.name:"UNKNOWN"});
}
export async function processWithdrawal(dbJobId:string,signer:WithdrawalSigner){
  const job=await prisma.withdrawalJob.findUnique({
    where:{id:dbJobId},
    include:{withdrawal:{include:{attempts:{orderBy:{attemptNumber:"desc"},take:1}}}}
  });if(!job)return;
  const withdrawal=job.withdrawal,existing=withdrawal.attempts[0];
  if(withdrawal.status==="COMPLETED"||job.status==="COMPLETED")return;
  if(!mayBroadcastWithdrawal({status:withdrawal.status,txHash:withdrawal.txHash??existing?.txHash,signedTransactionHash:existing?.signedTransactionHash})){if(withdrawal.txHash||existing?.txHash||existing?.signedTransactionHash)await reconcileWithdrawal(withdrawal.id,signer);return}
  const config=withdrawalConfig();
  if(config.WITHDRAWAL_AUTOMATION_ENABLED!=="true")return retryOrReview(job.id,withdrawal.id,new Error("AUTOMATION_DISABLED"));
  withdrawalLog("withdrawal_processing_started",{withdrawalId:withdrawal.id,userId:withdrawal.userId,network:withdrawal.network,amount:withdrawal.recipientAmount.toString(),attempt:job.attempts+1});
  try{
    const fromAddress=await signer.getAddress(),amountBaseUnits=withdrawalAmountBaseUnits(withdrawal.recipientAmount.toString()),balances=await signer.getBalance(),estimatedFee=await signer.estimateNetworkFee(withdrawal.destinationAddress,amountBaseUnits);
    if(balances.token<amountBaseUnits||balances.native<estimatedFee+config.WITHDRAWAL_NATIVE_GAS_RESERVE_WEI)throw new Error("HOT_WALLET_LIQUIDITY_INSUFFICIENT");
    const attempt=await withPostgresSerializationRetry(()=>prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${fromAddress.toLowerCase()}))`;
      const latest=await tx.withdrawal.findUniqueOrThrow({where:{id:withdrawal.id}});if(latest.txHash)throw new Error("TX_HASH_ALREADY_EXISTS");
      const pendingNonce=await signer.getPendingNonce(),highest=await tx.withdrawalBroadcastAttempt.findFirst({where:{chain:withdrawal.chain,network:withdrawal.network,fromAddress},orderBy:{nonce:"desc"},select:{nonce:true}}),nonce=nextSafeNonce(pendingNonce,highest?.nonce??null),attemptNumber=await tx.withdrawalBroadcastAttempt.count({where:{withdrawalId:withdrawal.id}})+1;
      await tx.withdrawal.update({where:{id:withdrawal.id},data:{status:"PROCESSING"}});
      await tx.withdrawalJob.update({where:{id:job.id},data:{status:"PROCESSING"}});
      return tx.withdrawalBroadcastAttempt.create({data:{withdrawalId:withdrawal.id,chain:withdrawal.chain,network:withdrawal.network,fromAddress,toAddress:withdrawal.destinationAddress,requestedAmount:withdrawal.recipientAmount,networkFee:new Prisma.Decimal(estimatedFee.toString()),nonce:BigInt(nonce),attemptNumber,status:"RESERVED"}});
    },{isolationLevel:"Serializable"}),{context:"WITHDRAWAL_NONCE_RESERVATION"});
    const prepared=await signer.prepareTransaction(withdrawal.destinationAddress,amountBaseUnits,Number(attempt.nonce));
    await prisma.withdrawalBroadcastAttempt.update({where:{id:attempt.id},data:{status:"SIGNING",signedTransactionHash:prepared.signedTransactionHash,networkFee:new Prisma.Decimal(prepared.networkFee.toString())}});
    let txHash:string;
    try{txHash=await signer.sendTransaction(prepared.rawTransaction)}
    catch{
      const receipt=await signer.getTransactionReceipt(prepared.signedTransactionHash).catch(()=>null);
      if(!receipt){await prisma.$transaction([prisma.withdrawalBroadcastAttempt.update({where:{id:attempt.id},data:{status:"UNCERTAIN",errorCode:"AMBIGUOUS_BROADCAST"}}),prisma.withdrawal.update({where:{id:withdrawal.id},data:{status:"MANUAL_REVIEW",failureCode:"AMBIGUOUS_BROADCAST"}}),prisma.withdrawalJob.update({where:{id:job.id},data:{status:"MANUAL_REVIEW",lastErrorCode:"AMBIGUOUS_BROADCAST"}})]);withdrawalLog("withdrawal_manual_review",{withdrawalId:withdrawal.id,reason:"AMBIGUOUS_BROADCAST"});return}
      txHash=prepared.signedTransactionHash;
    }
    if(txHash.toLowerCase()!==prepared.signedTransactionHash.toLowerCase())throw new Error("BROADCAST_HASH_MISMATCH");
    await prisma.$transaction([
      prisma.withdrawalBroadcastAttempt.update({where:{id:attempt.id},data:{status:"BROADCASTED",txHash,successKey:withdrawal.payoutIdempotencyKey}}),
      prisma.withdrawal.update({where:{id:withdrawal.id},data:{status:"BROADCASTED",txHash,broadcastedAt:new Date(),networkFeeBaseUnits:new Prisma.Decimal(prepared.networkFee.toString())}})
    ]);
    withdrawalLog("withdrawal_broadcasted",{withdrawalId:withdrawal.id,userId:withdrawal.userId,network:withdrawal.network,amount:withdrawal.recipientAmount.toString(),txHash,attempt:attempt.attemptNumber});
  }catch(error){if(error instanceof Error&&error.message==="TX_HASH_ALREADY_EXISTS"){await reconcileWithdrawal(withdrawal.id,signer);return}await retryOrReview(job.id,withdrawal.id,error)}
}

export async function reconcileWithdrawal(withdrawalId:string,signer:WithdrawalSigner){
  const withdrawal=await prisma.withdrawal.findUnique({where:{id:withdrawalId},include:{jobs:true,attempts:{orderBy:{attemptNumber:"desc"},take:1}}});if(!withdrawal||withdrawal.status==="COMPLETED")return;
  const attempt=withdrawal.attempts[0],hash=withdrawal.txHash??attempt?.txHash??attempt?.signedTransactionHash;
  if(!hash){if(attempt?.status==="SIGNING"||attempt?.status==="UNCERTAIN")await prisma.withdrawal.update({where:{id:withdrawal.id},data:{status:"MANUAL_REVIEW",failureCode:"AMBIGUOUS_BROADCAST"}});return}
  const receipt=await signer.getTransactionReceipt(hash);
  if(!receipt){await prisma.withdrawal.update({where:{id:withdrawal.id},data:{status:"CONFIRMING",txHash:withdrawal.txHash??hash}});return}
  if(receipt.status===0){await refundFailedWithdrawal(withdrawal.id,"ON_CHAIN_REVERT");return}
  const confirmations=Math.max(0,(await signer.getBlockNumber())-receipt.blockNumber+1),completed=confirmations>=withdrawal.requiredConfirmations;
  await prisma.$transaction([
    prisma.withdrawal.update({where:{id:withdrawal.id},data:{status:completed?"COMPLETED":"CONFIRMING",txHash:hash,confirmations,confirmedAt:completed?new Date():null,completedAt:completed?new Date():null}}),
    ...(attempt?[prisma.withdrawalBroadcastAttempt.update({where:{id:attempt.id},data:{status:completed?"CONFIRMED":"BROADCASTED",txHash:hash,successKey:withdrawal.payoutIdempotencyKey}})]:[]),
    ...(completed?withdrawal.jobs.map(job=>prisma.withdrawalJob.update({where:{id:job.id},data:{status:"COMPLETED"}})):[])
  ]);
  withdrawalLog(completed?"withdrawal_completed":"withdrawal_confirmation_updated",{withdrawalId:withdrawal.id,userId:withdrawal.userId,network:withdrawal.network,amount:withdrawal.recipientAmount.toString(),txHash:hash,confirmations});
}

export async function refundFailedWithdrawal(withdrawalId:string,reason:string){
  await withPostgresSerializationRetry(()=>prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Withdrawal" WHERE id=${withdrawalId} FOR UPDATE`;
    const withdrawal=await tx.withdrawal.findUniqueOrThrow({where:{id:withdrawalId}}),existing=await tx.withdrawalLedger.findUnique({where:{idempotencyKey:withdrawal.refundIdempotencyKey}});if(existing)return;
    await tx.$queryRaw`SELECT id FROM "UserState" WHERE "userId"=${withdrawal.userId} FOR UPDATE`;
    const state=await tx.userState.findUniqueOrThrow({where:{userId:withdrawal.userId}}),wallet=migrateWalletStore(state.wallet),before=new Prisma.Decimal(String(wallet.wallets.spot.balance)),after=before.add(withdrawal.debitedAmount),next:WalletStore={...wallet,wallets:{...wallet.wallets,spot:{...wallet.wallets.spot,balance:Number(after.toString())}},processedKeys:[withdrawal.refundIdempotencyKey,...wallet.processedKeys]};
    await tx.withdrawalLedger.create({data:{withdrawalId,userId:withdrawal.userId,idempotencyKey:withdrawal.refundIdempotencyKey,operation:"REFUND",amount:withdrawal.debitedAmount,balanceBefore:before,balanceAfter:after}});
    await tx.userState.update({where:{userId:withdrawal.userId},data:{wallet:next as unknown as Prisma.InputJsonValue}});
    await tx.withdrawal.update({where:{id:withdrawalId},data:{status:"REJECTED",failureCode:reason}});
    await tx.withdrawalJob.updateMany({where:{withdrawalId},data:{status:"COMPLETED"}});
  },{isolationLevel:"Serializable"}),{context:"WITHDRAWAL_REFUND"});
  withdrawalLog("withdrawal_refunded",{withdrawalId,reason});
}
