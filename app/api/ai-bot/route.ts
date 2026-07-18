import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { AI_BOT_PRICE, AI_BOT_VALIDITY_MS, aiBotStatus } from "@/lib/ai-bot";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, migrateWalletStore, purchaseAiBotFromSpot, type WalletStore } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";

const purchaseInput=z.object({idempotencyKey:z.string().trim().min(8).max(120)});

export async function GET(){
  try{
    const user=await requireAuthenticatedUser(),now=new Date();
    await prisma.aiBotSubscription.updateMany({where:{userId:user.id,status:"ACTIVE",expiresAt:{lte:now}},data:{status:"EXPIRED"}});
    const subscription=await prisma.aiBotSubscription.findFirst({where:{userId:user.id},orderBy:{activatedAt:"desc"}});
    return NextResponse.json({subscription:aiBotStatus(subscription,now.getTime()),price:AI_BOT_PRICE,validityDays:30},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Authentication required."},{status:401})}
}

export async function POST(request:Request){
  try{
    const user=await requireAuthenticatedUser(),input=purchaseInput.parse(await request.json()),now=new Date(),purchaseTransactionId=`AI_BOT_PURCHASE:${user.id}:${input.idempotencyKey}`;
    const result=await prisma.$transaction(async transaction=>{
      const duplicate=await transaction.aiBotSubscription.findUnique({where:{purchaseTransactionId}});
      if(duplicate){const state=await transaction.userState.findUnique({where:{userId:user.id}});return{subscription:duplicate,wallet:migrateWalletStore(state?.wallet),alreadyProcessed:true}}
      await transaction.aiBotSubscription.updateMany({where:{userId:user.id,status:"ACTIVE",expiresAt:{lte:now}},data:{status:"EXPIRED"}});
      const active=await transaction.aiBotSubscription.findFirst({where:{userId:user.id,status:"ACTIVE",activatedAt:{lte:now},expiresAt:{gt:now}}});
      if(active)throw new Error("AI Bot is already active.");
      const state=await transaction.userState.findUnique({where:{userId:user.id}}),wallet=purchaseAiBotFromSpot(migrateWalletStore(state?.wallet??cloneWalletSeed()),{key:purchaseTransactionId,userId:user.id,amount:AI_BOT_PRICE,timestamp:now.getTime()}),expiresAt=new Date(now.getTime()+AI_BOT_VALIDITY_MS);
      const subscription=await transaction.aiBotSubscription.create({data:{userId:user.id,price:new Prisma.Decimal(AI_BOT_PRICE),status:"ACTIVE",activatedAt:now,expiresAt,purchaseTransactionId}});
      const stored=await transaction.userState.upsert({where:{userId:user.id},create:{userId:user.id,wallet:wallet as object,trading:createEmptyTradingStore() as object},update:{wallet:wallet as object}});
      await transaction.userNotification.create({data:{userId:user.id,title:"AI Bot activated",message:"Your AI Bot is active for 30 days and will automatically join eligible AI Copy Trading sessions.",type:"AI_BOT_PURCHASE",reference:purchaseTransactionId}});
      return{subscription,wallet:stored.wallet as unknown as WalletStore,alreadyProcessed:false};
    },{isolationLevel:"Serializable"});
    return NextResponse.json({...result,subscription:aiBotStatus(result.subscription,now.getTime()),price:AI_BOT_PRICE,validityDays:30},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof z.ZodError?"Invalid purchase request.":error instanceof Error?error.message:"AI Bot purchase failed.";
    return NextResponse.json({error:message},{status:message.includes("Insufficient")||message.includes("already active")?409:400});
  }
}
