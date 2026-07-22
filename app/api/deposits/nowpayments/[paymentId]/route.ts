import { NextResponse } from "next/server";
import { z } from "zod";
import { getDepositUser } from "@/lib/nowpayments/identity.server";
import { refreshDeposit, setMockDepositStatus } from "@/lib/nowpayments/deposit-service.server";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
import { localizeDepositRecord } from "@/lib/nowpayments/deposit-time.server";
const paymentIdSchema=z.string().min(3).max(160).regex(/^[A-Za-z0-9_-]+$/);
export async function GET(request:Request,{params}:{params:Promise<{paymentId:string}>}){try{const paymentId=paymentIdSchema.parse((await params).paymentId),mockStatus=new URL(request.url).searchParams.get("mockStatus"),user=await getDepositUser(),record=mockStatus?await setMockDepositStatus(user,paymentId,mockStatus):await refreshDeposit(user,paymentId),display=await localizeDepositRecord(user.id,record);return NextResponse.json(display,{headers:{"Cache-Control":"no-store"}})}catch(error){return depositApiError(error)}}
