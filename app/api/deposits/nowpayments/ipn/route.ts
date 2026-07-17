import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyIpnSignature, type ProviderPayment } from "@/lib/nowpayments/client.server";
import { reconcileIpn } from "@/lib/nowpayments/deposit-service.server";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
const ipnSchema=z.object({payment_id:z.union([z.string(),z.number()]),payment_status:z.string(),pay_address:z.string(),price_amount:z.coerce.number(),price_currency:z.string(),pay_amount:z.coerce.number(),pay_currency:z.string(),order_id:z.string(),actually_paid:z.coerce.number().optional(),updated_at:z.string().optional(),payin_hash:z.string().optional()}).passthrough();
export async function POST(request:Request){try{const raw:unknown=await request.json(),signature=request.headers.get("x-nowpayments-sig")??"";if(!verifyIpnSignature(raw,signature))return NextResponse.json({error:"Invalid IPN signature."},{status:401});const payload=ipnSchema.parse(raw);await reconcileIpn(payload as ProviderPayment);return NextResponse.json({ok:true})}catch(error){return depositApiError(error)}}
