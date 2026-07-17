import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { KycError, submitKyc } from "@/lib/kyc/kyc-service.server";
export async function POST(request:Request){try{return NextResponse.json(await submitKyc(await getKycUser(),await request.formData()))}catch(error){if(error instanceof KycError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});if(error instanceof ZodError)return NextResponse.json({error:"Invalid KYC information.",issues:error.issues},{status:400});return NextResponse.json({error:error instanceof Error?error.message:"KYC submission failed."},{status:400})}}
