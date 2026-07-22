import type { Prisma } from "@prisma/client";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { addMoney, cloneWalletSeed, migrateWalletStore, money, type ReferralCommission, type ReferralCommissionType, type WalletStore, type WalletTransaction } from "@/lib/wallet-data";

export const FIRST_TRANSFER_EVENT="FIRST_SPOT_TO_FUTURE";
export const referralLogCodes={sponsorNotFound:"SPONSOR_NOT_FOUND",notFirstTransfer:"NOT_FIRST_TRANSFER",belowMinimum:"FIRST_TRANSFER_BELOW_MINIMUM",alreadyExists:"DISTRIBUTION_ALREADY_EXISTS",created:"DISTRIBUTION_CREATED",pipelineError:"REFERRAL_PIPELINE_ERROR",recipientNotFound:"LEVEL_RECIPIENT_NOT_FOUND",recipientNotQualified:"LEVEL_RECIPIENT_NOT_QUALIFIED",chainEnded:"SPONSOR_CHAIN_ENDED",cycleDetected:"GENEALOGY_CYCLE_DETECTED",levelAlreadyPaid:"LEVEL_ALREADY_PAID",levelIncomeCreated:"LEVEL_INCOME_CREATED",referralAlreadyPaid:"REFERRAL_ALREADY_PAID",referralIncomeCreated:"REFERRAL_INCOME_CREATED"} as const;

type DbUser={id:string;uid:string;sponsorId:string|null;sponsorUid:string|null};
export type IncomeType="REFERRAL_INCOME"|"LEVEL_INCOME";
export type PayoutPlan={recipient:DbUser;level:number;incomeType:IncomeType;percentage:number;amount:number;transactionType:"SPOT_REFERRAL_INCOME"|"SPOT_LEVEL_INCOME";commissionType:ReferralCommissionType};
export type DistributionOutcome={level:number;recipientUserId:string|null;recipientUid:string|null;incomeType:IncomeType;code:string;qualification:{qualified:boolean;qualifyingFuturePrincipal:number|null;reason:string|null};amount:number;existingPayout:boolean;newlyCreated:boolean};

export function buildFirstTransferPayoutPlan(source:DbUser,users:readonly DbUser[],amount:number):PayoutPlan[]{
  if(money(amount)<50)return[];
  const byId=new Map(users.map(user=>[user.id,user])),result:PayoutPlan[]=[],seen=new Set([source.id]);let sponsorId=source.sponsorId;
  for(let position=0;position<5&&sponsorId;position++){
    const recipient=byId.get(sponsorId);if(!recipient||seen.has(recipient.id))break;seen.add(recipient.id);
    const level=position+1;
    if(level===1)result.push({recipient,level,incomeType:"REFERRAL_INCOME",percentage:5,amount:money(amount*.05),transactionType:"SPOT_REFERRAL_INCOME",commissionType:"DIRECT_REFERRAL_INCOME"});
    result.push({recipient,level,incomeType:"LEVEL_INCOME",percentage:1,amount:money(amount*.01),transactionType:"SPOT_LEVEL_INCOME",commissionType:`LEVEL_${level}_INCOME` as ReferralCommissionType});
    sponsorId=recipient.sponsorId;
  }
  return result;
}

const safeLog=(code:string,data:Record<string,unknown>)=>console.info(JSON.stringify({component:"first-transfer-referral",code,...data}));
const entryKey=(entry:{level:number;transactionType:string})=>`${entry.transactionType==="SPOT_REFERRAL_INCOME"?"REFERRAL_INCOME":"LEVEL_INCOME"}:${entry.transactionType==="SPOT_REFERRAL_INCOME"?1:entry.level}`;

export async function distributeFirstSpotToFuture(tx:Prisma.TransactionClient,input:{source:DbUser;users:DbUser[];amount:number;transferId:string;transferReference:string;idempotencyKey:string;timestamp:number}){
  const existing=await tx.referralDistribution.findUnique({where:{referredUserId_eventType:{referredUserId:input.source.id,eventType:FIRST_TRANSFER_EVENT}},include:{entries:true}});
  const distributionAmount=existing?money(Number(existing.transferAmount)):money(input.amount),sourceTransferId=existing?.sourceTransferId??input.transferId;
  const plan=buildFirstTransferPayoutPlan(input.source,input.users,distributionAmount),below=distributionAmount<50,missingSponsor=!below&&plan.length===0;
  const distribution=existing??await tx.referralDistribution.create({data:{referredUserId:input.source.id,eventType:FIRST_TRANSFER_EVENT,sourceTransferId:input.transferId,idempotencyKey:`REFERRAL:${FIRST_TRANSFER_EVENT}:${input.source.id}`,transferAmount:input.amount,status:plan.length?"CREATED":"NO_PAYOUT",resultCode:below?referralLogCodes.belowMinimum:missingSponsor?referralLogCodes.sponsorNotFound:referralLogCodes.created}});
  const completedPayouts=new Set(existing?.entries.map(entryKey)??[]),outcomes:DistributionOutcome[]=[];
  for(const payout of plan){
    const payoutKey=`${payout.incomeType}:${payout.level}`,base={level:payout.level,recipientUserId:payout.recipient.id,recipientUid:payout.recipient.uid,incomeType:payout.incomeType,amount:payout.amount};
    const state=await tx.userState.findUnique({where:{userId:payout.recipient.id}}),wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),financial=tx.aiFinancialWallet?await tx.aiFinancialWallet.findUnique({where:{userId:payout.recipient.id},select:{retainedPrincipal:true}}):null,retainedPrincipal=financial?Number(financial.retainedPrincipal.toString()):wallet.totalFuturePrincipal;
    const requiresQualification=payout.incomeType==="LEVEL_INCOME"&&payout.level>=2,qualified=!requiresQualification||retainedPrincipal>=50;
    const qualification={qualified,qualifyingFuturePrincipal:requiresQualification?retainedPrincipal:null,reason:qualified?null:"FUTURE_PRINCIPAL_BELOW_50"};
    if(completedPayouts.has(payoutKey)){const code=payout.incomeType==="LEVEL_INCOME"?referralLogCodes.levelAlreadyPaid:referralLogCodes.referralAlreadyPaid;outcomes.push({...base,code,qualification,existingPayout:true,newlyCreated:false});safeLog(code,{...base,...qualification});continue}
    if(!qualified){outcomes.push({...base,code:referralLogCodes.recipientNotQualified,qualification,existingPayout:false,newlyCreated:false});safeLog(referralLogCodes.recipientNotQualified,{...base,...qualification});continue}
    const ledgerId=`${sourceTransferId}:${payout.incomeType}:level-${payout.level}`,before=wallet.wallets.spot.balance,after=addMoney(before,payout.amount),direct=payout.incomeType==="REFERRAL_INCOME";
    const ledger:WalletTransaction={id:ledgerId,userId:payout.recipient.id,wallet:"spot",type:payout.transactionType,title:direct?"Direct referral income":`Level ${payout.level} income`,amount:payout.amount,balanceBefore:before,balanceAfter:after,status:"COMPLETED",reference:`${input.transferReference} · source:${input.source.id} · ${payout.percentage}%`,timestamp:input.timestamp};
    const commission:ReferralCommission={id:ledgerId,sourceUserId:input.source.id,sourceUserUid:input.source.uid,recipientUserId:payout.recipient.id,recipientUserUid:payout.recipient.uid,sponsorUid:input.source.sponsorUid??"",commissionType:payout.commissionType,level:direct?0:payout.level,percentage:payout.percentage,amount:payout.amount,sourceTransferReference:input.transferReference,timestamp:input.timestamp,status:"COMPLETED"};
    const next:WalletStore={...wallet,wallets:{...wallet.wallets,spot:{...wallet.wallets.spot,balance:after}},spotIncome:{...wallet.spotIncome,[direct?"referralIncome":"levelIncome"]:addMoney(direct?wallet.spotIncome.referralIncome:wallet.spotIncome.levelIncome,payout.amount)},transactions:[ledger,...wallet.transactions],processedKeys:[ledgerId,...wallet.processedKeys],referralCommissions:[commission,...wallet.referralCommissions]};
    await tx.userState.upsert({where:{userId:payout.recipient.id},create:{userId:payout.recipient.id,wallet:next as object,trading:createEmptyTradingStore() as object},update:{wallet:next as object}});
    await tx.referralIncomeEntry.create({data:{distributionId:distribution.id,recipientUserId:payout.recipient.id,sourceReferredUserId:input.source.id,sourceTransferId,level:payout.level,incomeType:payout.incomeType,percentage:payout.percentage,amount:payout.amount,transactionType:payout.transactionType,ledgerTransactionId:ledgerId}});
    await tx.userNotification.create({data:{userId:payout.recipient.id,title:direct?"Referral income credited":`Level ${payout.level} income credited`,message:`$${payout.amount.toFixed(2)} was credited to your Spot Wallet.`,type:payout.incomeType,reference:`referral-income:${ledgerId}`}});
    await tx.referralIncomeAuditLog.create({data:{distributionId:distribution.id,recipientUserId:payout.recipient.id,sourceReferredUserId:input.source.id,level:payout.level,action:"SPOT_WALLET_INCOME_CREDITED",ledgerTransactionId:ledgerId,metadata:{incomeType:payout.incomeType,amount:payout.amount,percentage:payout.percentage,transactionType:payout.transactionType,sourceTransferId}}});
    completedPayouts.add(payoutKey);
    const code=payout.incomeType==="LEVEL_INCOME"?referralLogCodes.levelIncomeCreated:referralLogCodes.referralIncomeCreated;outcomes.push({...base,code,qualification,existingPayout:false,newlyCreated:true});safeLog(code,base);
  }
  const byId=new Map(input.users.map(user=>[user.id,user])),seen=new Set([input.source.id]);let currentSponsorId=input.source.sponsorId;
  for(let level=1;level<=5;level++){
    if(!currentSponsorId){for(let missingLevel=level;missingLevel<=5;missingLevel++){const outcome:DistributionOutcome={level:missingLevel,recipientUserId:null,recipientUid:null,incomeType:"LEVEL_INCOME",code:referralLogCodes.chainEnded,qualification:{qualified:false,qualifyingFuturePrincipal:null,reason:"SPONSOR_ID_MISSING"},amount:money(distributionAmount*.01),existingPayout:false,newlyCreated:false};outcomes.push(outcome);safeLog(outcome.code,{level:missingLevel,reason:outcome.qualification.reason})}break}
    const recipient=byId.get(currentSponsorId);
    if(!recipient){const outcome:DistributionOutcome={level,recipientUserId:currentSponsorId,recipientUid:null,incomeType:"LEVEL_INCOME",code:referralLogCodes.recipientNotFound,qualification:{qualified:false,qualifyingFuturePrincipal:null,reason:"SPONSOR_USER_NOT_FOUND"},amount:money(distributionAmount*.01),existingPayout:false,newlyCreated:false};outcomes.push(outcome);safeLog(outcome.code,{level,recipientUserId:currentSponsorId});for(let missingLevel=level+1;missingLevel<=5;missingLevel++)outcomes.push({...outcome,level:missingLevel,recipientUserId:null,code:referralLogCodes.chainEnded,qualification:{...outcome.qualification,reason:"PREVIOUS_SPONSOR_NOT_FOUND"}});break}
    if(seen.has(recipient.id)){const outcome:DistributionOutcome={level,recipientUserId:recipient.id,recipientUid:recipient.uid,incomeType:"LEVEL_INCOME",code:referralLogCodes.cycleDetected,qualification:{qualified:false,qualifyingFuturePrincipal:null,reason:"SPONSOR_ID_REPEATED"},amount:money(distributionAmount*.01),existingPayout:false,newlyCreated:false};outcomes.push(outcome);safeLog(outcome.code,{level,recipientUserId:recipient.id,recipientUid:recipient.uid});for(let missingLevel=level+1;missingLevel<=5;missingLevel++)outcomes.push({...outcome,level:missingLevel,recipientUserId:null,recipientUid:null,code:referralLogCodes.chainEnded,qualification:{...outcome.qualification,reason:"GENEALOGY_CYCLE_PREVENTED_TRAVERSAL"}});break}
    seen.add(recipient.id);currentSponsorId=recipient.sponsorId;
  }
  safeLog(distribution.resultCode,{referredUserId:input.source.id,sourceTransferId:input.transferId,distributionId:distribution.id,recipientCount:plan.length});
  const reconciled=await tx.referralDistribution.findUniqueOrThrow({where:{id:distribution.id},include:{entries:true}});
  return{...reconciled,outcomes};
}
