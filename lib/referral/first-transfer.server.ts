import type { Prisma } from "@prisma/client";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { addMoney, cloneWalletSeed, migrateWalletStore, money, type ReferralCommission, type ReferralCommissionType, type WalletStore, type WalletTransaction } from "@/lib/wallet-data";

export const FIRST_TRANSFER_EVENT="FIRST_SPOT_TO_FUTURE";
export const referralLogCodes={
  sponsorNotFound:"SPONSOR_NOT_FOUND",notFirstTransfer:"NOT_FIRST_TRANSFER",belowMinimum:"FIRST_TRANSFER_BELOW_MINIMUM",
  alreadyExists:"DISTRIBUTION_ALREADY_EXISTS",created:"DISTRIBUTION_CREATED",pipelineError:"REFERRAL_PIPELINE_ERROR",
} as const;

type DbUser={id:string;uid:string;sponsorId:string|null;sponsorUid:string|null};
export type PayoutPlan={recipient:DbUser;level:number;percentage:number;amount:number;transactionType:"SPOT_REFERRAL_INCOME"|"SPOT_LEVEL_INCOME";commissionType:ReferralCommissionType};

export function buildFirstTransferPayoutPlan(source:DbUser,users:readonly DbUser[],amount:number):PayoutPlan[]{
  if(money(amount)<50)return[];
  const byId=new Map(users.map(user=>[user.id,user])),result:PayoutPlan[]=[],seen=new Set([source.id]);let sponsorId=source.sponsorId;
  for(let position=0;position<6&&sponsorId;position++){
    const recipient=byId.get(sponsorId);if(!recipient||seen.has(recipient.id))break;seen.add(recipient.id);
    const direct=position===0,level=direct?0:position,percentage=direct?5:1;
    result.push({recipient,level,percentage,amount:money(amount*percentage/100),transactionType:direct?"SPOT_REFERRAL_INCOME":"SPOT_LEVEL_INCOME",commissionType:direct?"DIRECT_REFERRAL_INCOME":`LEVEL_${level}_INCOME` as ReferralCommissionType});
    sponsorId=recipient.sponsorId;
  }
  return result;
}

const safeLog=(code:string,data:Record<string,unknown>)=>console.info(JSON.stringify({component:"first-transfer-referral",code,...data}));

export async function distributeFirstSpotToFuture(tx:Prisma.TransactionClient,input:{source:DbUser;users:DbUser[];amount:number;transferId:string;transferReference:string;idempotencyKey:string;timestamp:number}){
  const existing=await tx.referralDistribution.findUnique({where:{referredUserId_eventType:{referredUserId:input.source.id,eventType:FIRST_TRANSFER_EVENT}},include:{entries:true}});
  if(existing){safeLog(referralLogCodes.alreadyExists,{referredUserId:input.source.id,sourceTransferId:input.transferId,distributionId:existing.id});return existing}
  const plan=buildFirstTransferPayoutPlan(input.source,input.users,input.amount),below=money(input.amount)<50,missingSponsor=!below&&plan.length===0;
  const distribution=await tx.referralDistribution.create({data:{referredUserId:input.source.id,eventType:FIRST_TRANSFER_EVENT,sourceTransferId:input.transferId,idempotencyKey:`REFERRAL:${FIRST_TRANSFER_EVENT}:${input.source.id}`,transferAmount:input.amount,status:plan.length?"CREATED":"NO_PAYOUT",resultCode:below?referralLogCodes.belowMinimum:missingSponsor?referralLogCodes.sponsorNotFound:referralLogCodes.created}});
  for(const payout of plan){
    const state=await tx.userState.findUnique({where:{userId:payout.recipient.id}}),wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),ledgerId=`${distribution.id}:level-${payout.level}`,before=wallet.wallets.spot.balance,after=addMoney(before,payout.amount);
    const ledger:WalletTransaction={id:ledgerId,userId:payout.recipient.id,wallet:"spot",type:payout.transactionType,title:payout.level===0?"Direct referral income":`Level ${payout.level} income`,amount:payout.amount,balanceBefore:before,balanceAfter:after,status:"COMPLETED",reference:`${input.transferReference} · source:${input.source.id} · ${payout.percentage}%`,timestamp:input.timestamp};
    const commission:ReferralCommission={id:ledgerId,sourceUserId:input.source.id,sourceUserUid:input.source.uid,recipientUserId:payout.recipient.id,recipientUserUid:payout.recipient.uid,sponsorUid:input.source.sponsorUid??"",commissionType:payout.commissionType,level:payout.level,percentage:payout.percentage,amount:payout.amount,sourceTransferReference:input.transferReference,timestamp:input.timestamp,status:"COMPLETED"};
    const next:WalletStore={...wallet,wallets:{...wallet.wallets,spot:{...wallet.wallets.spot,balance:after}},spotIncome:{...wallet.spotIncome,[payout.level===0?"referralIncome":"levelIncome"]:addMoney(payout.level===0?wallet.spotIncome.referralIncome:wallet.spotIncome.levelIncome,payout.amount)},transactions:[ledger,...wallet.transactions],processedKeys:[ledgerId,...wallet.processedKeys],referralCommissions:[commission,...wallet.referralCommissions]};
    await tx.userState.upsert({where:{userId:payout.recipient.id},create:{userId:payout.recipient.id,wallet:next as object,trading:createEmptyTradingStore() as object},update:{wallet:next as object}});
    await tx.referralIncomeEntry.create({data:{distributionId:distribution.id,recipientUserId:payout.recipient.id,sourceReferredUserId:input.source.id,sourceTransferId:input.transferId,level:payout.level,percentage:payout.percentage,amount:payout.amount,transactionType:payout.transactionType,ledgerTransactionId:ledgerId}});
  }
  safeLog(distribution.resultCode,{referredUserId:input.source.id,sourceTransferId:input.transferId,distributionId:distribution.id,recipientCount:plan.length});
  return tx.referralDistribution.findUniqueOrThrow({where:{id:distribution.id},include:{entries:true}});
}
