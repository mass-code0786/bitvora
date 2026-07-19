import { PrismaClient } from "@prisma/client";
import { migrateWalletStore } from "../lib/wallet-data";
import { distributeFirstSpotToFuture, FIRST_TRANSFER_EVENT } from "../lib/referral/first-transfer.server";

const prisma=new PrismaClient();

const uidArg=process.argv.find(value=>value.startsWith("--uid="))?.slice(6).toUpperCase(),apply=process.argv.includes("--apply");

async function main(){
  const users=await prisma.user.findMany({where:uidArg?{uid:uidArg}:undefined,select:{id:true,uid:true,sponsorId:true,sponsorUid:true,state:{select:{wallet:true}}}}),candidates=[];
  for(const user of users){
    const wallet=migrateWalletStore(user.state?.wallet),first=wallet.transactions.filter(item=>item.type==="SPOT_TO_FUTURE_TRANSFER"&&item.wallet==="spot"&&item.status==="COMPLETED").sort((a,b)=>a.timestamp-b.timestamp)[0];
    if(!first||Math.abs(first.amount)!==500)continue;
    const existing=await prisma.referralDistribution.findUnique({where:{referredUserId_eventType:{referredUserId:user.id,eventType:FIRST_TRANSFER_EVENT}}});if(existing)continue;
    candidates.push({user,first});
  }
  console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",candidates:candidates.map(({user,first})=>({userId:user.id,uid:user.uid,sponsorId:user.sponsorId,sponsorUid:user.sponsorUid,transferId:first.id,amount:Math.abs(first.amount),status:first.status,idempotencyKey:first.id.replace(/:debit$/,"")}))},null,2));
  if(!apply)return;
  if(candidates.length!==1)throw new Error(`Expected exactly one affected case; found ${candidates.length}. Pass --uid=BVxxxxxx to select it safely.`);
  const target=candidates[0],allUsers=await prisma.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true}});
  await prisma.$transaction(tx=>distributeFirstSpotToFuture(tx,{source:target.user,users:allUsers,amount:Math.abs(target.first.amount),transferId:target.first.id,transferReference:target.first.reference,idempotencyKey:target.first.id.replace(/:debit$/,"").replace(/^transfer-/,""),timestamp:target.first.timestamp}),{isolationLevel:"Serializable"});
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect());
