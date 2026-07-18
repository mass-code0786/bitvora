import { NextResponse } from "next/server";
import { BUSINESS_TIME_ZONE, canUseAdditional, createDailySessions, getSessionPhase, getTradingDate, migrateTradingStore } from "@/lib/ai-trading-engine";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const user=await requireAuthenticatedUser(),serverNow=Date.now(),tradingDate=getTradingDate(serverNow),sessions=createDailySessions(tradingDate,serverNow),state=await prisma.userState.findUnique({where:{userId:user.id},select:{trading:true}}),store=migrateTradingStore(state?.trading),eligible=sessions.filter(session=>session.type==="REGULAR"||canUseAdditional(store,session));
    const current=eligible.find(session=>{const phase=getSessionPhase(session,serverNow),trade=store.trades.find(item=>item.userId===user.id&&item.sessionId===session.id);return phase==="UPCOMING"||phase==="LIVE"||Boolean(trade?.status==="PLACED"&&phase==="PROCESSING")})??null,trade=current?store.trades.find(item=>item.userId===user.id&&item.sessionId===current.id):null,status=current?(trade?.status==="MISSED"?"MISSED":trade?"COMPLETED":getSessionPhase(current,serverNow)==="LIVE"?"LIVE":"UPCOMING"):"COMPLETED";
    return NextResponse.json({serverNow,timeZone:BUSINESS_TIME_ZONE,tradingDate,sessions,currentSession:current?{id:current.id,startTime:current.liveFrom,countdownTarget:getSessionPhase(current,serverNow)==="LIVE"?current.placementClosesAt:current.liveFrom,pair:current.pair,signal:current.signalDirection==="CALL"?"BUY":"SELL",eligible:true,status,placementSource:trade?.placementSource??null}:null},{headers:{"Cache-Control":"private, no-store"}})
  }catch{return NextResponse.json({error:"Authentication required."},{status:401})}
}
