import { NextResponse } from "next/server";
import { getDepositUser } from "@/lib/nowpayments/identity.server";
import { listServerDeposits } from "@/lib/nowpayments/deposit-store.server";
import { localizeDepositRecord } from "@/lib/nowpayments/deposit-time.server";
import { depositApiError } from "@/lib/nowpayments/route-utils.server";
export async function GET(){try{const user=await getDepositUser(),records=await listServerDeposits(user.id);return NextResponse.json({records:await Promise.all(records.map(record=>localizeDepositRecord(user.id,record)))},{headers:{"Cache-Control":"no-store"}})}catch(error){return depositApiError(error)}}
