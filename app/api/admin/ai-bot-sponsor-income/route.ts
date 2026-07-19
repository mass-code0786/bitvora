import { NextResponse } from "next/server";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { prisma } from "@/lib/prisma";

export async function GET(){
  try{
    await requireDemoAdmin();
    const records=await prisma.aiBotSponsorIncome.findMany({include:{sponsor:{select:{uid:true}},buyer:{select:{uid:true}}},orderBy:{createdAt:"desc"},take:500});
    return NextResponse.json({records:records.map(record=>({id:record.id,sponsorUid:record.sponsor.uid,buyerUid:record.buyer.uid,purchaseAmount:Number(record.purchaseAmount),percentage:Number(record.percentage),commissionAmount:Number(record.commissionAmount),subscriptionId:record.botSubscriptionId,purchaseTransactionId:record.botPurchaseTransactionId,createdAt:record.createdAt.getTime(),status:record.status}))},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Admin access required."},{status:401})}
}
