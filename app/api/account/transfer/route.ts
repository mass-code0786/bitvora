import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, getTransferQuote, migrateWalletStore, money, transferBetweenWallets, type WalletStore } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";
import { distributeFirstSpotToFuture, referralLogCodes } from "@/lib/referral/first-transfer.server";

const input=z.object({from:z.enum(["spot","future"]),amount:z.number().positive(),idempotencyKey:z.string().min(8).max(120),confirmedEarlyTransfer:z.boolean().optional().default(false)});

export async function POST(request:Request){
  try{
    const authUser=await requireAuthenticatedUser(),value=input.parse(await request.json()),amount=money(value.amount);
    const result=await prisma.$transaction(async transaction=>{
      const user=await transaction.user.findUniqueOrThrow({where:{id:authUser.id},select:{id:true,uid:true,sponsorId:true,sponsorUid:true}}),state=await transaction.userState.findUnique({where:{userId:user.id}}),wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),alreadyProcessed=wallet.processedKeys.includes(value.idempotencyKey);
      if(alreadyProcessed){const transfer=wallet.transactions.find(item=>item.id===`${value.idempotencyKey}:credit`),details=transfer?.transferDetails;if(!details)throw new Error("Transfer request was already processed.");if(value.from==="spot"){const users=await transaction.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true}});await distributeFirstSpotToFuture(transaction,{source:user,users,amount:details.grossAmount,transferId:`${value.idempotencyKey}:debit`,transferReference:transfer.reference,idempotencyKey:value.idempotencyKey,timestamp:transfer.timestamp})}return{wallet,quote:{grossAmount:details.grossAmount,earlyTransferFee:details.deductionAmount,netCredit:details.netAmount,earlyTransfer:details.deductionAmount>0,progressPercentage:details.progressPercentage},alreadyProcessed:true}}
      const quote=getTransferQuote(wallet,value.from,amount);
      if(quote.earlyTransfer&&!value.confirmedEarlyTransfer)return{wallet:null,quote,alreadyProcessed:false,requiresConfirmation:true};
      const timestamp=Date.now(),users=value.from==="spot"?await transaction.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true}}):[],genealogy=users.map(item=>({...item,sponsorId:item.sponsorId??"",sponsorUid:item.sponsorUid??""}));
      const calculated=transferBetweenWallets(wallet,value.from,amount,value.idempotencyKey,timestamp,{sourceUserId:user.id,genealogy,distributeReferrals:false}),next={...calculated,transactions:calculated.transactions.map(item=>item.id.startsWith(`${value.idempotencyKey}:`)?{...item,userId:user.id}:item)};
      if(value.from==="spot"&&!wallet.referralQualification.consumed)await distributeFirstSpotToFuture(transaction,{source:user,users,amount,transferId:`${value.idempotencyKey}:debit`,transferReference:`wallet-transfer:${value.idempotencyKey}`,idempotencyKey:value.idempotencyKey,timestamp});
      else if(value.from==="spot")console.info(JSON.stringify({component:"first-transfer-referral",code:referralLogCodes.notFirstTransfer,referredUserId:user.id,sourceTransferId:`${value.idempotencyKey}:debit`}));
      const stored=await transaction.userState.upsert({where:{userId:user.id},create:{userId:user.id,wallet:next as object,trading:createEmptyTradingStore() as object},update:{wallet:next as object}});
      return{wallet:stored.wallet as unknown as WalletStore,quote,alreadyProcessed:false};
    },{isolationLevel:"Serializable"});
    if("requiresConfirmation" in result)return NextResponse.json({error:"Early-transfer confirmation is required.",quote:result.quote,requiresConfirmation:true},{status:409,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error(JSON.stringify({component:"first-transfer-referral",code:referralLogCodes.pipelineError,error:error instanceof Error?error.name:"UNKNOWN"}));
    const message=error instanceof z.ZodError?"Invalid transfer request.":error instanceof Error?error.message:"Transfer could not be completed.";
    const status=message==="UNAUTHENTICATED"?401:message.startsWith("Insufficient")?409:400;
    return NextResponse.json({error:message==="UNAUTHENTICATED"?"Authentication required.":message},{status});
  }
}
