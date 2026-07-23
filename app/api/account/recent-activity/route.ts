import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { formatUserTimestamp,resolveUserTimeZone } from "@/lib/timezone.server";
import { formatLegacyRecentActivity,mapAuthoritativeAiActivity,mergeRecentActivity } from "@/lib/recent-activity";
import { migrateWalletStore } from "@/lib/wallet-data";

export async function GET(){
  try{
    const user=await requireAuthenticatedUser();
    const[state,profile,ledger]=await Promise.all([
      prisma.userState.findUnique({where:{userId:user.id},select:{wallet:true}}),
      prisma.user.findUnique({where:{id:user.id},select:{timezone:true,country:true}}),
      prisma.aiWalletLedger.findMany({where:{userId:user.id,operation:{in:["PRINCIPAL_LOCK","PRINCIPAL_RETURN","PROFIT_CREDIT"]}},orderBy:{officialAt:"desc"},take:100})
    ]);
    const timeZone=resolveUserTimeZone(profile?.timezone,profile?.country);
    const authoritative=ledger.map(mapAuthoritativeAiActivity).filter(item=>item!==null);
    const legacy=formatLegacyRecentActivity(migrateWalletStore(state?.wallet).transactions);
    const activity=mergeRecentActivity(authoritative,legacy).slice(0,20).map(item=>({...item,...formatUserTimestamp(item.timestamp,timeZone)}));
    return NextResponse.json({activity},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Authentication required."},{status:401})}
}
