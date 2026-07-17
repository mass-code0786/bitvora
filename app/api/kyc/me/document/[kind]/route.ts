import { NextResponse } from "next/server";
import { z } from "zod";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { findKycByUserId } from "@/lib/kyc/kyc-store.server";
import { getKycDocument, KycError } from "@/lib/kyc/kyc-service.server";
export async function GET(_:Request,{params}:{params:Promise<{kind:string}>}){try{const kind=z.enum(["front","back","selfie"]).parse((await params).kind),record=await findKycByUserId((await getKycUser()).id);if(!record)return new NextResponse(null,{status:404});const file=await getKycDocument(record,kind);return new NextResponse(file.bytes,{headers:{"Content-Type":file.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}catch(error){return new NextResponse(null,{status:error instanceof KycError?error.status:400})}}
