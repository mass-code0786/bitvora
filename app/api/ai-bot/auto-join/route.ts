import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { executeAiBotSession } from "@/lib/ai-bot-auto-trade.server";

const input=z.object({sessionId:z.string().min(8).max(160)});
export async function POST(request:Request){try{const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),result=await executeAiBotSession(user.id,value.sessionId);return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}})}catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Invalid session request.":"Unable to execute this AI Bot session."},{status:error instanceof z.ZodError?400:500})}}
