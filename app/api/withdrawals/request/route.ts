import { NextResponse } from "next/server";
import { z } from "zod";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { assertWithdrawalKycEligibility,KycError } from "@/lib/kyc/kyc-service.server";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore } from "@/lib/wallet-data";
import { createWithdrawal,WithdrawalRequestError } from "@/lib/withdrawals/submission.server";
import { withdrawalResponse } from "@/lib/withdrawals/types";

const schema=z.object({amount:z.number().positive(),network:z.literal("BEP20"),address:z.string().trim().min(1).max(128),clientRequestId:z.string().min(8).max(120).optional(),idempotencyKey:z.string().min(8).max(120).optional()}).refine(value=>Boolean(value.clientRequestId??value.idempotencyKey));
export async function POST(request:Request){
  try{
    const value=schema.parse(await request.json()),user=await getKycUser();await assertWithdrawalKycEligibility(user.id);
    const withdrawal=await createWithdrawal(user.id,{amount:value.amount,network:value.network,address:value.address,clientRequestId:value.clientRequestId??value.idempotencyKey!}),state=await prisma.userState.findUnique({where:{userId:user.id},select:{wallet:true}});
    return NextResponse.json({...withdrawalResponse(withdrawal),record:withdrawalResponse(withdrawal),wallet:migrateWalletStore(state?.wallet)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof KycError||error instanceof WithdrawalRequestError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});
    if(error instanceof z.ZodError)return NextResponse.json({error:"Invalid withdrawal request.",code:"INVALID_REQUEST"},{status:400});
    console.error(JSON.stringify({event:"withdrawal_request_failed",errorCode:error instanceof Error?error.name:"UNKNOWN"}));
    return NextResponse.json({error:"Withdrawal request could not be processed safely.",code:"WITHDRAWAL_UNAVAILABLE"},{status:503});
  }
}
