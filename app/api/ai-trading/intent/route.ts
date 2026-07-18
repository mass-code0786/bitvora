import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { AiIntentError, createTradeIntent, placeIntentTrade, publicSignal, readTradeIntent } from "@/lib/ai-trade-intent.server";
const createInput=z.object({sessionId:z.string().min(8).max(160)}),placeInput=z.object({token:z.string().min(32).max(200),side:z.enum(["BUY","SELL"])});
const failure=(error:unknown)=>NextResponse.json({error:error instanceof AiIntentError?error.message:error instanceof z.ZodError?error.issues[0]?.message:"Trading signal request failed."},{status:error instanceof AiIntentError?error.status:400});
export async function GET(request:Request){try{const user=await requireAuthenticatedUser(),token=new URL(request.url).searchParams.get("token")??"",value=await readTradeIntent(user.id,token);return NextResponse.json({session:publicSignal(value.session)},{headers:{"Cache-Control":"private, no-store"}})}catch(error){return failure(error)}}
export async function POST(request:Request){try{const user=await requireAuthenticatedUser(),value=createInput.parse(await request.json());return NextResponse.json(await createTradeIntent({id:user.id,uid:user.uid},value.sessionId),{status:201})}catch(error){return failure(error)}}
export async function PUT(request:Request){try{const user=await requireAuthenticatedUser(),value=placeInput.parse(await request.json());return NextResponse.json(await placeIntentTrade({id:user.id,uid:user.uid},value.token,value.side))}catch(error){return failure(error)}}
