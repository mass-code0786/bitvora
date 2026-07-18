import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { cloneWalletSeed } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";

const input=z.object({wallet:z.unknown().optional(),trading:z.unknown().optional()}).refine(value=>value.wallet!==undefined||value.trading!==undefined);
export async function GET(){try{const user=await requireAuthenticatedUser(),state=await prisma.userState.findUnique({where:{userId:user.id}});return NextResponse.json({wallet:state?.wallet??cloneWalletSeed(),trading:state?.trading??createEmptyTradingStore()},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
export async function PUT(request:Request){try{const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),create={userId:user.id,wallet:(value.wallet??cloneWalletSeed()) as object,trading:(value.trading??createEmptyTradingStore()) as object},update:{wallet?:object;trading?:object}={};if(value.wallet!==undefined)update.wallet=value.wallet as object;if(value.trading!==undefined)update.trading=value.trading as object;const state=await prisma.userState.upsert({where:{userId:user.id},create,update});return NextResponse.json({wallet:state.wallet,trading:state.trading})}catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Invalid account state.":"Unable to save account state."},{status:400})}}
