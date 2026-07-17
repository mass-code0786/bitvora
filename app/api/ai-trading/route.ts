import { NextResponse } from "next/server";
import { BUSINESS_TIME_ZONE, createDailySessions, getTradingDate } from "@/lib/ai-trading-engine";

export const dynamic="force-dynamic";
export function GET(){const serverNow=Date.now(),tradingDate=getTradingDate(serverNow);return NextResponse.json({serverNow,timeZone:BUSINESS_TIME_ZONE,tradingDate,sessions:createDailySessions(tradingDate,serverNow)},{headers:{"Cache-Control":"no-store"}})}
