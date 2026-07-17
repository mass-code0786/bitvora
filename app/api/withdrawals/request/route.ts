import { NextResponse } from "next/server";
import { z } from "zod";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { assertWithdrawalKycEligibility, KycError } from "@/lib/kyc/kyc-service.server";
const schema=z.object({amount:z.number().positive(),network:z.enum(["BEP20","TRC20","ERC20"]),address:z.string().trim().min(8)});
export async function POST(request:Request){try{schema.parse(await request.json());await assertWithdrawalKycEligibility((await getKycUser()).id);return NextResponse.json({eligible:true,note:"Withdrawal processing remains a later phase."})}catch(error){if(error instanceof KycError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});return NextResponse.json({error:"Invalid withdrawal request."},{status:400})}}
