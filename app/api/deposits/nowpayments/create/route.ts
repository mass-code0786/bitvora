import { NextResponse } from "next/server";
import { createDeposit, createDepositSchema } from "@/lib/nowpayments/deposit-service.server";
import { getDepositUser } from "@/lib/nowpayments/identity.server";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
import { localizeDepositRecord } from "@/lib/nowpayments/deposit-time.server";
export async function POST(request:Request){try{const input=createDepositSchema.parse(await request.json()),user=await getDepositUser(),record=await createDeposit(user,input),display=await localizeDepositRecord(user.id,record);return NextResponse.json({...display,internalDepositId:record.id,qrData:record.payAddress})}catch(error){return depositApiError(error)}}
