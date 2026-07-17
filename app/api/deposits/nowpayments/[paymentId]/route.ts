import { NextResponse } from "next/server";
import { z } from "zod";
import { getDepositUser } from "@/lib/nowpayments/identity.server";
import { refreshDeposit, setMockDepositStatus } from "@/lib/nowpayments/deposit-service.server";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
const paymentIdSchema=z.string().min(3).max(160).regex(/^[A-Za-z0-9_-]+$/);
export async function GET(request:Request,{params}:{params:Promise<{paymentId:string}>}){try{const paymentId=paymentIdSchema.parse((await params).paymentId),mockStatus=new URL(request.url).searchParams.get("mockStatus"),user=await getDepositUser(),record=mockStatus?await setMockDepositStatus(user,paymentId,mockStatus):await refreshDeposit(user,paymentId);return NextResponse.json({...record,credit:record.creditStatus==="CREDITED"?{providerPaymentId:record.providerPaymentId,orderId:record.orderId,network:record.network,amount:record.amountCredited,txHash:record.txHash,timestamp:record.finishedAt??record.updatedAt}:null})}catch(error){return depositApiError(error)}}
