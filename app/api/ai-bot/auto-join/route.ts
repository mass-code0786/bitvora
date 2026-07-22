import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { createEmptyTradingStore, getSessionById, migrateTradingStore, placeUserTrade, type AiTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, lockFutureTradeCapital, migrateWalletStore, type WalletStore } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";
import { resolveUserTimeZone } from "@/lib/timezone.server";

const input=z.object({sessionId:z.string().min(8).max(160)});

export async function POST(request:Request){
  try{
    const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),now=Date.now(),profile=await prisma.user.findUnique({where:{id:user.id},select:{timezone:true,country:true}}),session=getSessionById(value.sessionId,now,resolveUserTimeZone(profile?.timezone,profile?.country));
    if(!session)return NextResponse.json({joined:false,reason:"SESSION_NOT_FOUND"},{status:404});
    const result=await prisma.$transaction(async transaction=>{
      const subscription=await transaction.aiBotSubscription.findFirst({where:{userId:user.id,status:"ACTIVE",activatedAt:{lte:new Date(session.liveFrom)},expiresAt:{gt:new Date(now)}} ,orderBy:{activatedAt:"desc"}});
      if(!subscription||session.liveFrom>=subscription.expiresAt.getTime())return{joined:false,reason:"BOT_INACTIVE" as const};
      const state=await transaction.userState.findUnique({where:{userId:user.id}}),wallet=migrateWalletStore(state?.wallet??cloneWalletSeed()),trading=migrateTradingStore(state?.trading??createEmptyTradingStore());
      try{
        const placed=placeUserTrade({store:trading,session,userId:user.id,userUid:user.uid,futureBalance:wallet.wallets.future.balance,now,placementSource:"AI_BOT"});
        if(!placed.created)return{joined:false,reason:"ALREADY_JOINED" as const,wallet,trading};
        const details={userUid:user.uid,tradeId:placed.trade.id,sessionId:session.id,pair:session.pair,direction:placed.trade.direction,source:"AI_BOT" as const,grossFutureBalance:placed.trade.balanceSnapshot,tradeCapital:placed.trade.tradeCapital,profitPercentage:placed.trade.profitRate,profitAmount:placed.trade.profitAmount},nextWallet=lockFutureTradeCapital(wallet,placed.trade.tradeCapital,placed.trade.idempotencyKey,details,now);
        const stored=await transaction.userState.upsert({where:{userId:user.id},create:{userId:user.id,wallet:nextWallet as object,trading:placed.store as object},update:{wallet:nextWallet as object,trading:placed.store as object}});
        return{joined:true,trade:placed.trade,wallet:stored.wallet as unknown as WalletStore,trading:stored.trading as unknown as AiTradingStore};
      }catch(error){return{joined:false,reason:error instanceof Error?error.message:"NOT_ELIGIBLE" as const}}
    },{isolationLevel:"Serializable"});
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Invalid session request.":"Authentication required."},{status:error instanceof z.ZodError?400:401})}
}
