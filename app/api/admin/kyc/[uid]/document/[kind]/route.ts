import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { findKycByUid } from "@/lib/kyc/kyc-store.server";
import { getKycDocument, KycError } from "@/lib/kyc/kyc-service.server";
export async function GET(_:Request,{params}:{params:Promise<{uid:string;kind:string}>}){try{await requireDemoAdmin();const value=await params,kind=z.enum(["front","back","selfie"]).parse(value.kind),record=await findKycByUid(value.uid);if(!record)return new NextResponse(null,{status:404});const file=await getKycDocument(record,kind);return new NextResponse(file.bytes,{headers:{"Content-Type":file.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; img-src 'self'"}})}catch(error){return new NextResponse(null,{status:error instanceof KycError?error.status:403})}}
