import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { prisma } from "@/lib/prisma";
import { approveAdminWithdrawal,rejectAdminWithdrawal,WithdrawalAdminError } from "@/lib/withdrawals/admin.server";
const action=z.discriminatedUnion("action",[
  z.object({action:z.literal("APPROVE"),withdrawalId:z.string().min(1),txHash:z.string(),targetStatus:z.enum(["BROADCASTED","COMPLETED"]).default("BROADCASTED")}),
  z.object({action:z.literal("REJECT"),withdrawalId:z.string().min(1),reason:z.string().min(3).max(500)})
]);
export async function GET(){try{await requireDemoAdmin();const rows=await prisma.withdrawal.findMany({include:{user:{select:{id:true,uid:true,name:true,email:true}},ledger:true,adminActions:{orderBy:{createdAt:"desc"}}},orderBy:{createdAt:"desc"},take:500});return NextResponse.json({withdrawals:rows.map(row=>({...row,requestedAmount:row.requestedAmount.toString(),platformFee:row.platformFee.toString(),recipientAmount:row.recipientAmount.toString(),debitedAmount:row.debitedAmount.toString(),networkFeeBaseUnits:row.networkFeeBaseUnits.toString(),previousHistoryCount:rows.filter(other=>other.userId===row.userId&&other.createdAt<row.createdAt).length}))},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Admin access required."},{status:401})}}
export async function POST(request:Request){try{const admin=await requireDemoAdmin(),value=action.parse(await request.json()),result=value.action==="APPROVE"?await approveAdminWithdrawal(value.withdrawalId,admin.id,value.txHash,value.targetStatus):await rejectAdminWithdrawal(value.withdrawalId,admin.id,value.reason);return NextResponse.json({withdrawalId:result.id,status:result.status,txHash:result.txHash})}catch(error){if(error instanceof WithdrawalAdminError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message??"Invalid admin action."},{status:400});return NextResponse.json({error:"Admin withdrawal action failed."},{status:500})}}
