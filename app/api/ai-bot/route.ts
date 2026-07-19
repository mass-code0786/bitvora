import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { AI_BOT_PRICE, AI_BOT_VALIDITY_MS, aiBotStatus } from "@/lib/ai-bot";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, creditAiBotSponsorIncome, migrateWalletStore, money, purchaseAiBotFromSpot, type WalletStore } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";

const purchaseInput=z.object({idempotencyKey:z.string().trim().min(8).max(120)});
const SPONSOR_PERCENTAGE=10;

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
      if(duplicate){
        const[state,sponsorIncome]=await Promise.all([transaction.userState.findUnique({where:{userId:user.id}}),transaction.aiBotSponsorIncome.findUnique({where:{botPurchaseTransactionId:purchaseTransactionId}})]);
        return{subscription:duplicate,wallet:migrateWalletStore(state?.wallet),alreadyProcessed:true,sponsorIncome,resultCode:sponsorIncome?"AI_BOT_SPONSOR_INCOME_ALREADY_PAID":"AI_BOT_SPONSOR_NOT_FOUND"};
      }
      await transaction.aiBotSubscription.updateMany({where:{userId:user.id,status:"ACTIVE",expiresAt:{lte:now}},data:{status:"EXPIRED"}});
      const active=await transaction.aiBotSubscription.findFirst({where:{userId:user.id,status:"ACTIVE",activatedAt:{lte:now},expiresAt:{gt:now}}});
      if(active)throw new Error("AI Bot is already active.");
      const[buyer,state]=await Promise.all([
        transaction.user.findUnique({where:{id:user.id},select:{id:true,uid:true,sponsor:{select:{id:true,uid:true}}}}),
        transaction.userState.findUnique({where:{userId:user.id}}),
      ]);
      if(!buyer)throw new Error("Buyer account was not found.");
      const purchaseAmount=money(AI_BOT_PRICE),buyerWallet=purchaseAiBotFromSpot(migrateWalletStore(state?.wallet??cloneWalletSeed()),{key:purchaseTransactionId,userId:user.id,amount:purchaseAmount,timestamp:now.getTime()}),expiresAt=new Date(now.getTime()+AI_BOT_VALIDITY_MS);
      const subscription=await transaction.aiBotSubscription.create({data:{userId:user.id,price:new Prisma.Decimal(purchaseAmount),status:"ACTIVE",activatedAt:now,expiresAt,purchaseTransactionId}});
      const stored=await transaction.userState.upsert({where:{userId:user.id},create:{userId:user.id,wallet:buyerWallet as object,trading:createEmptyTradingStore() as object},update:{wallet:buyerWallet as object}});
      await transaction.userNotification.create({data:{userId:user.id,title:"AI Bot activated",message:"Your AI Bot is active for 30 days and will automatically join eligible AI Copy Trading sessions.",type:"AI_BOT_PURCHASE",reference:purchaseTransactionId}});

      const sponsor=buyer.sponsor?.id!==buyer.id?buyer.sponsor:null;
      if(!sponsor){
        console.info(JSON.stringify({component:"ai-bot-purchase",code:"AI_BOT_SPONSOR_NOT_FOUND",buyerUserId:buyer.id,buyerUid:buyer.uid,purchaseTransactionId}));
        return{subscription,wallet:stored.wallet as unknown as WalletStore,alreadyProcessed:false,sponsorIncome:null,resultCode:"AI_BOT_SPONSOR_NOT_FOUND"};
      }
      const commissionAmount=money(purchaseAmount*SPONSOR_PERCENTAGE/100),incomeKey=`${purchaseTransactionId}:AI_BOT_SPONSOR_INCOME`,ledgerTransactionId=`${incomeKey}:credit`,sponsorState=await transaction.userState.findUnique({where:{userId:sponsor.id}}),sponsorWallet=creditAiBotSponsorIncome(migrateWalletStore(sponsorState?.wallet??cloneWalletSeed()),{key:incomeKey,sponsorUserId:sponsor.id,buyerUid:buyer.uid,subscriptionId:subscription.id,purchaseTransactionId,purchaseAmount,percentage:SPONSOR_PERCENTAGE,commissionAmount,timestamp:now.getTime()});
      await transaction.userState.upsert({where:{userId:sponsor.id},create:{userId:sponsor.id,wallet:sponsorWallet as object,trading:createEmptyTradingStore() as object},update:{wallet:sponsorWallet as object}});
      const sponsorIncome=await transaction.aiBotSponsorIncome.create({data:{sponsorUserId:sponsor.id,buyerUserId:buyer.id,botSubscriptionId:subscription.id,botPurchaseTransactionId:purchaseTransactionId,purchaseAmount:new Prisma.Decimal(purchaseAmount),percentage:new Prisma.Decimal(SPONSOR_PERCENTAGE),commissionAmount:new Prisma.Decimal(commissionAmount),ledgerTransactionId,status:"COMPLETED"}});
      await transaction.userNotification.create({data:{userId:sponsor.id,title:"AI Bot Sponsor Income",message:`From: ${buyer.uid} · Purchase: $${purchaseAmount.toFixed(2)} · Commission: +$${commissionAmount.toFixed(2)}`,type:"AI_BOT_SPONSOR_INCOME",reference:`ai-bot-sponsor-income:${purchaseTransactionId}`}});
      await transaction.aiBotSponsorIncomeAuditLog.create({data:{sponsorIncomeId:sponsorIncome.id,sponsorUserId:sponsor.id,action:"AI_BOT_SPONSOR_INCOME_CREDITED",ledgerTransactionId,metadata:{sponsorUserId:sponsor.id,buyerUserId:buyer.id,buyerUid:buyer.uid,botSubscriptionId:subscription.id,botPurchaseTransactionId:purchaseTransactionId,purchaseAmount,percentage:SPONSOR_PERCENTAGE,commissionAmount,status:"COMPLETED"}}});
      return{subscription,wallet:stored.wallet as unknown as WalletStore,alreadyProcessed:false,sponsorIncome,resultCode:"AI_BOT_SPONSOR_INCOME_CREATED"};
    },{isolationLevel:"Serializable"});
    return NextResponse.json({...result,subscription:aiBotStatus(result.subscription,now.getTime()),price:AI_BOT_PRICE,validityDays:30},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof z.ZodError?"Invalid purchase request.":error instanceof Error?error.message:"AI Bot purchase failed.";
    return NextResponse.json({error:message},{status:message.includes("Insufficient")||message.includes("already active")?409:400});
  }
}
