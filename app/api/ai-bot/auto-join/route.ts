import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { enqueueUserSessionTrade } from "@/lib/ai-trade-scale/orchestrator";

const input=z.object({sessionId:z.string().min(8).max(160)});
export async function POST(request:Request){try{const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),active=await prisma.aiBotSubscription.findFirst({where:{userId:user.id,status:"ACTIVE",activatedAt:{lte:new Date()},expiresAt:{gt:new Date()}},select:{id:true}});if(!active)return NextResponse.json({joined:false,reason:"BOT_INACTIVE"},{status:403});const run=await enqueueUserSessionTrade(user.id,value.sessionId,"AI_BOT");return NextResponse.json({joined:true,reason:"QUEUED",executionKey:`${user.id}:${run.localTradingDate}:${run.sessionId}:AI_BOT`},{headers:{"Cache-Control":"no-store"}})}catch(error){const message=error instanceof Error?error.message:"";return NextResponse.json({error:error instanceof z.ZodError?"Invalid session request.":message==="NOT_ELIGIBLE"?"Additional trade is not eligible for this account.":message==="SESSION_NOT_LIVE"?"Trading session is not live.":"Unable to queue this AI Bot session."},{status:error instanceof z.ZodError?400:message==="NOT_ELIGIBLE"?403:message==="SESSION_NOT_LIVE"?409:500})}}
