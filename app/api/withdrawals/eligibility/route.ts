import { NextResponse } from "next/server";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { assertWithdrawalKycEligibility, getSafeKycForUser, KycError } from "@/lib/kyc/kyc-service.server";
export async function GET(){const user=await getKycUser(),kyc=await getSafeKycForUser(user.id);try{await assertWithdrawalKycEligibility(user.id);return NextResponse.json({eligible:true,status:kyc.status})}catch(error){return NextResponse.json({eligible:false,status:kyc.status,error:error instanceof Error?error.message:"KYC required",code:error instanceof KycError?error.code:"KYC_REQUIRED_FOR_WITHDRAWAL"},{status:403})}}
