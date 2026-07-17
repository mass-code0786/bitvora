import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { findKycByUid } from "@/lib/kyc/kyc-store.server";
import { maskDocumentNumber } from "@/lib/kyc/kyc-types";
import { reviewKyc, KycError } from "@/lib/kyc/kyc-service.server";
const schema=z.object({action:z.enum(["APPROVE","REJECT"]),reason:z.string().max(500).optional(),idempotencyKey:z.string().min(8)});
export async function GET(_:Request,{params}:{params:Promise<{uid:string}>}){try{await requireDemoAdmin();const record=await findKycByUid((await params).uid);if(!record)return NextResponse.json({error:"KYC not found."},{status:404});return NextResponse.json({...record,documentNumber:maskDocumentNumber(record.documentNumber),hasBack:Boolean(record.documentBackPath),documentFrontPath:undefined,documentBackPath:undefined,selfiePath:undefined})}catch{return NextResponse.json({error:"Admin access required."},{status:401})}}
export async function POST(request:Request,{params}:{params:Promise<{uid:string}>}){try{const admin=await requireDemoAdmin(),input=schema.parse(await request.json()),result=await reviewKyc((await params).uid,input.action,admin.id,input.reason);return NextResponse.json({changed:result.changed,record:{...result.record,documentNumber:maskDocumentNumber(result.record.documentNumber),hasBack:Boolean(result.record.documentBackPath),documentFrontPath:undefined,documentBackPath:undefined,selfiePath:undefined}})}catch(error){if(error instanceof KycError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});return NextResponse.json({error:"KYC review failed."},{status:400})}}
