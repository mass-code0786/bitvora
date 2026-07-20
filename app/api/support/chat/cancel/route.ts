import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { assertMutationRequest } from "@/lib/support-security.server";
const input=z.object({generationId:z.string().min(8).max(140)}).strict();
export async function POST(request:Request){try{const user=await requireAuthenticatedUser();assertMutationRequest(request,user.id);const value=input.parse(await request.json()),result=await prisma.chatMessage.updateMany({where:{generationId:value.generationId,generationStatus:{in:["STREAMING","CANCELLED"]},conversation:{userId:user.id}},data:{message:"Generation stopped.",generationStatus:"CANCELLED",failureCode:"USER_CANCELLED",completedAt:new Date()}});return NextResponse.json({cancelled:Boolean(result.count)})}catch{return NextResponse.json({error:"Unable to cancel generation."},{status:400})}}
