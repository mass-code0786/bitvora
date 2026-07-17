import { NextResponse } from "next/server";
import { createDeposit, createDepositSchema } from "@/lib/nowpayments/deposit-service.server";
import { getDepositUser } from "@/lib/nowpayments/identity.server";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
export async function POST(request:Request){try{const input=createDepositSchema.parse(await request.json()),record=await createDeposit(await getDepositUser(),input);return NextResponse.json({...record,internalDepositId:record.id,qrData:record.payAddress})}catch(error){return depositApiError(error)}}
