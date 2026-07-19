import { PrismaClient } from "@prisma/client";
import { migrateWalletStore, money, type WalletTransaction } from "../lib/wallet-data";
import { distributeFirstSpotToFuture, FIRST_TRANSFER_EVENT } from "../lib/referral/first-transfer.server";

const prisma=new PrismaClient(),uidArg=process.argv.find(value=>value.startsWith("--uid="))?.slice(6).toUpperCase(),apply=process.argv.includes("--apply");
type Candidate={user:{id:string;uid:string;sponsorId:string|null;sponsorUid:string|null};first:WalletTransaction};

/** Supports current debit/credit pairs and migrated v1 client records, whose wallet may be `future`. */
export function findFirstSuccessfulSpotToFuture(walletValue:unknown){
  const wallet=migrateWalletStore(walletValue),successful=wallet.transactions.filter(item=>item.type==="SPOT_TO_FUTURE_TRANSFER"&&["COMPLETED","SUCCESS"].includes(String(item.status))).sort((a,b)=>a.timestamp-b.timestamp||a.amount-b.amount);
  if(!successful.length)return null;
  const earliestTimestamp=successful[0].timestamp,sameEvent=successful.filter(item=>item.timestamp===earliestTimestamp||item.reference===successful[0].reference),debit=sameEvent.find(item=>item.amount<0);
  return debit??successful[0];
}

async function main(){
  const records=await prisma.user.findMany({where:uidArg?{uid:uidArg}:undefined,select:{id:true,uid:true,sponsorId:true,sponsorUid:true,state:{select:{wallet:true}}}}),candidates:Candidate[]=[],diagnostics=[];
  for(const record of records){
    const user={id:record.id,uid:record.uid,sponsorId:record.sponsorId,sponsorUid:record.sponsorUid},wallet=migrateWalletStore(record.state?.wallet),first=findFirstSuccessfulSpotToFuture(record.state?.wallet),sponsor=record.sponsorId?await prisma.user.findUnique({where:{id:record.sponsorId},select:{id:true,uid:true}}):null,distribution=await prisma.referralDistribution.findUnique({where:{referredUserId_eventType:{referredUserId:record.id,eventType:FIRST_TRANSFER_EVENT}},include:{entries:true}}),amount=first?money(Math.abs(first.transferDetails?.grossAmount??first.amount)):null;
    const reason=!first?"NO_SUCCESSFUL_SPOT_TO_FUTURE":amount!==null&&amount<50?"FIRST_TRANSFER_BELOW_MINIMUM":!record.sponsorId?"SPONSOR_ID_MISSING":!sponsor?"SPONSOR_NOT_FOUND":record.sponsorUid!==sponsor.uid?"SPONSOR_UID_ID_MISMATCH":distribution?"DISTRIBUTION_ALREADY_EXISTS":"ELIGIBLE";
    diagnostics.push({userId:record.id,uid:record.uid,sponsorId:record.sponsorId,sponsorUid:record.sponsorUid,resolvedSponsorUid:sponsor?.uid??null,firstTransfer:first?{id:first.id,reference:first.reference,wallet:first.wallet,type:first.type,status:first.status,amount,timestamp:first.timestamp}:null,firstTransferConsumed:wallet.referralQualification.consumed,firstTransferAmount:wallet.referralQualification.firstTransferAmount,distribution:distribution?{id:distribution.id,status:distribution.status,resultCode:distribution.resultCode,entries:distribution.entries.length}:null,reason});
    if(reason==="ELIGIBLE"&&first)candidates.push({user,first:{...first,amount:amount!}});
  }
  console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",diagnostics,candidates:candidates.map(({user,first})=>({userId:user.id,uid:user.uid,sponsorId:user.sponsorId,sponsorUid:user.sponsorUid,transferId:first.id,amount:Math.abs(first.amount),status:first.status,idempotencyKey:first.id.replace(/:(debit|credit)$/,"")}))},null,2));
  if(!apply)return;
  if(candidates.length!==1)throw new Error(`Expected exactly one eligible case; found ${candidates.length}. Pass --uid=BVxxxxxx to select it safely.`);
  const target=candidates[0],allUsers=await prisma.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true}}),amount=money(Math.abs(target.first.transferDetails?.grossAmount??target.first.amount));
  const result=await prisma.$transaction(tx=>distributeFirstSpotToFuture(tx,{source:target.user,users:allUsers,amount,transferId:target.first.id,transferReference:target.first.reference,idempotencyKey:target.first.id.replace(/:(debit|credit)$/,"").replace(/^transfer-/,""),timestamp:target.first.timestamp}),{isolationLevel:"Serializable"});
  console.log(JSON.stringify({repaired:true,distributionId:result.id,status:result.status,resultCode:result.resultCode,entries:result.entries.map(entry=>({recipientUserId:entry.recipientUserId,level:entry.level,percentage:String(entry.percentage),amount:String(entry.amount),ledgerTransactionId:entry.ledgerTransactionId}))},null,2));
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect());
