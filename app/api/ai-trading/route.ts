import { NextResponse } from "next/server";
import { BUSINESS_TIME_ZONE, canUseAdditional, createDailySessions, getSessionPhase, getTradingDate, migrateTradingStore } from "@/lib/ai-trading-engine";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore } from "@/lib/wallet-data";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const user=await requireAuthenticatedUser(),serverNow=Date.now(),tradingDate=getTradingDate(serverNow),sessions=createDailySessions(tradingDate,serverNow),record=await prisma.user.findUnique({where:{id:user.id},select:{timezone:true,state:{select:{trading:true,wallet:true}}}}),store=migrateTradingStore(record?.state?.trading),wallet=migrateWalletStore(record?.state?.wallet),timezone=record?.timezone||"UTC",localDate=(value:number)=>new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value)),today=localDate(serverNow),todayFutureWalletNetChange=wallet.transactions.filter(item=>item.wallet==="future"&&localDate(item.timestamp)===today).reduce((cents,item)=>cents+Math.round(item.amount*100),0)/100,eligible=sessions.filter(session=>session.type==="REGULAR"||canUseAdditional(store,session));
    const current=eligible.find(session=>{const phase=getSessionPhase(session,serverNow),trade=store.trades.find(item=>item.userId===user.id&&item.sessionId===session.id);return phase==="UPCOMING"||phase==="LIVE"||Boolean(trade?.status==="PLACED"&&phase==="PROCESSING")})??null,trade=current?store.trades.find(item=>item.userId===user.id&&item.sessionId===current.id):null,status=current?(trade?.status==="MISSED"?"MISSED":trade?"COMPLETED":getSessionPhase(current,serverNow)==="LIVE"?"LIVE":"UPCOMING"):"COMPLETED";
    return NextResponse.json({serverNow,timeZone:BUSINESS_TIME_ZONE,userTimeZone:timezone,tradingDate,futureWalletBalance:wallet.wallets.future.balance,todayFutureWalletNetChange,sessions,currentSession:current?{id:current.id,startTime:current.liveFrom,countdownTarget:getSessionPhase(current,serverNow)==="LIVE"?current.placementClosesAt:current.liveFrom,pair:current.pair,signal:current.signalDirection==="CALL"?"BUY":"SELL",eligible:true,status,placementSource:trade?.placementSource??null}:null},{headers:{"Cache-Control":"private, no-store"}})
  }catch{return NextResponse.json({error:"Authentication required."},{status:401})}
}
