import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, getTransferQuote, migrateWalletStore, money, transferBetweenWallets, type WalletStore } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";

const input=z.object({from:z.literal("future"),amount:z.number().positive(),idempotencyKey:z.string().min(8).max(120)});

export async function POST(request:Request){
  try{
    const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),amount=money(value.amount);
    const result=await prisma.$transaction(async transaction=>{
      const state=await transaction.userState.findUnique({where:{userId:user.id}}),wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),alreadyProcessed=wallet.processedKeys.includes(value.idempotencyKey);
      if(alreadyProcessed){const details=wallet.transactions.find(item=>item.id===`${value.idempotencyKey}:credit`)?.transferDetails;if(!details)throw new Error("Transfer request was already processed.");return{wallet,quote:{grossAmount:details.grossAmount,earlyTransferFee:details.deductionAmount,netCredit:details.netAmount,earlyTransfer:details.deductionAmount>0,progressPercentage:details.progressPercentage},alreadyProcessed:true}}
      const quote=getTransferQuote(wallet,"future",amount),next=transferBetweenWallets(wallet,"future",amount,value.idempotencyKey,Date.now()),stored=await transaction.userState.upsert({where:{userId:user.id},create:{userId:user.id,wallet:next as object,trading:createEmptyTradingStore() as object},update:{wallet:next as object}});
      return{wallet:stored.wallet as unknown as WalletStore,quote,alreadyProcessed:false};
    },{isolationLevel:"Serializable"});
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof z.ZodError?"Invalid transfer request.":error instanceof Error?error.message:"Transfer could not be completed.";
    const status=message==="UNAUTHENTICATED"?401:message.startsWith("Insufficient")?409:400;
    return NextResponse.json({error:message==="UNAUTHENTICATED"?"Authentication required.":message},{status});
  }
}
