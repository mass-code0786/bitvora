import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { listServerDeposits, findDepositByPaymentId } from "@/lib/nowpayments/deposit-store.server";
import { refreshDeposit } from "@/lib/nowpayments/deposit-service.server";
const schema=z.object({action:z.enum(["REFRESH","REVIEW"]),paymentId:z.string().min(3),note:z.string().max(1000).optional()});
export async function GET(){try{await requireDemoAdmin();return NextResponse.json({records:(await listServerDeposits()).sort((a,b)=>b.createdAt-a.createdAt)})}catch{return NextResponse.json({error:"Admin access required."},{status:401})}}
export async function POST(request:Request){try{await requireDemoAdmin();const input=schema.parse(await request.json()),record=await findDepositByPaymentId(input.paymentId);if(!record)return NextResponse.json({error:"Deposit not found."},{status:404});if(input.action==="REVIEW")return NextResponse.json({record});const refreshed=await refreshDeposit({id:record.userId,uid:record.userUid},record.providerPaymentId);return NextResponse.json({record:refreshed})}catch{return NextResponse.json({error:"Admin deposit action failed."},{status:400})}}
