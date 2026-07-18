import { NextResponse } from "next/server";
import { BUSINESS_TIME_ZONE, canUseAdditional, createDailySessions, getSessionPhase, getTradingDate, getUserSessionStatus, markExpiredSessionsMissed, migrateTradingStore, reconcileSessionNotifications, removeStaleMissedSessions } from "@/lib/ai-trading-engine";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore } from "@/lib/wallet-data";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const user=await requireAuthenticatedUser(),serverNow=Date.now(),tradingDate=getTradingDate(serverNow),sessions=createDailySessions(tradingDate,serverNow).sort((a,b)=>a.liveFrom-b.liveFrom);
    const result=await prisma.$transaction(async transaction=>{
      const record=await transaction.user.findUnique({where:{id:user.id},select:{uid:true,timezone:true,state:{select:{id:true,trading:true,wallet:true}}}});
      if(!record)throw new Error("UNAUTHENTICATED");
      const wallet=migrateWalletStore(record.state?.wallet),original=migrateTradingStore(record.state?.trading),cleaned=removeStaleMissedSessions(original,sessions,user.id),reconciled=markExpiredSessionsMissed(reconcileSessionNotifications(cleaned,sessions,user.id,serverNow),sessions,user.id,record.uid,serverNow);
      if(JSON.stringify(reconciled)!==JSON.stringify(original)&&record.state)await transaction.userState.update({where:{userId:user.id},data:{trading:reconciled as object}});
      return{record,store:reconciled,wallet};
    });
    const{record,store,wallet}=result,timezone=record.timezone||"UTC",localDate=(value:number)=>new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value)),today=localDate(serverNow),todayFutureWalletNetChange=wallet.transactions.filter(item=>item.wallet==="future"&&localDate(item.timestamp)===today).reduce((cents,item)=>cents+Math.round(item.amount*100),0)/100,eligible=sessions.filter(session=>session.type==="REGULAR"||canUseAdditional(store,session)),current=eligible.find(session=>{const phase=getSessionPhase(session,serverNow),trade=store.trades.find(item=>item.userId===user.id&&item.sessionId===session.id);return phase==="UPCOMING"||phase==="LIVE"||Boolean(trade?.status==="PLACED"&&phase==="PROCESSING")})??null,trade=current?store.trades.find(item=>item.userId===user.id&&item.sessionId===current.id):null,status=current?getUserSessionStatus(current,trade,serverNow):"COMPLETED",eligibleToTrade=Boolean(current&&status==="LIVE"&&!trade&&wallet.wallets.future.balance>0),blockReason=!current?"No eligible session.":status==="UPCOMING"?"Trade unlocks when the backend marks this session LIVE.":status==="JOINED"||status==="COMPLETED"?"This session was already joined.":status==="MISSED"?"This session has expired.":wallet.wallets.future.balance<=0?"Insufficient Future Wallet balance.":null;
    if(current?.sequence===3)console.info("[ai-session-status]",{sessionId:current.id,businessDate:tradingDate,scheduledAt:new Date(current.scheduledAt).toISOString(),liveStartsAt:new Date(current.liveFrom).toISOString(),liveEndsAt:new Date(current.placementClosesAt).toISOString(),serverNow:new Date(serverNow).toISOString(),computedStatus:status,userId:user.id,userDisplayTimezone:timezone,eligible:eligibleToTrade});
    return NextResponse.json({serverNow,timeZone:BUSINESS_TIME_ZONE,userTimeZone:timezone,tradingDate,futureWalletBalance:wallet.wallets.future.balance,todayFutureWalletNetChange,sessions,currentSession:current?{id:current.id,scheduledAt:current.scheduledAt,liveStartsAt:current.liveFrom,liveEndsAt:current.placementClosesAt,startTime:current.liveFrom,countdownTarget:status==="LIVE"?current.placementClosesAt:current.liveFrom,pair:current.pair,signal:current.signalDirection==="CALL"?"BUY":"SELL",eligible:eligibleToTrade,status,blockReason,placementSource:trade?.placementSource??null}:null},{headers:{"Cache-Control":"private, no-store"}})
  }catch(error){console.error("[ai-session-status] request_failed",{message:error instanceof Error?error.message:"unknown"});return NextResponse.json({error:"Authentication required."},{status:401})}
}
