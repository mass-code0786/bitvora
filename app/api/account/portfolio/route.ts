import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { migrateWalletStore, money } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";
import { calculatePortfolioGrowth } from "@/lib/portfolio-growth";
import { localCalendarDate, resolveUserTimeZone } from "@/lib/timezone.server";
import { getWalletReadSnapshot } from "@/lib/future-wallet.server";

export async function GET(){
  try{
    const authUser=await requireAuthenticatedUser(),[user,financial]=await Promise.all([prisma.user.findUnique({where:{id:authUser.id},select:{timezone:true,country:true,state:{select:{wallet:true}}}}),getWalletReadSnapshot(authUser.id)]);
    if(!user)throw new Error("UNAUTHENTICATED");
    const timezone=resolveUserTimeZone(user.timezone,user.country),today=localCalendarDate(Date.now(),timezone),wallet=migrateWalletStore(user.state?.wallet),spotWallet=money(wallet.wallets.spot.balance),futureWallet=money(Number(financial.availableFuture.toString())),totalWallet=money(spotWallet+futureWallet);
    const baseline=await prisma.portfolioSnapshot.upsert({where:{userId_localDate:{userId:authUser.id,localDate:today}},create:{userId:authUser.id,localDate:today,timezone,spotBalance:spotWallet,futureBalance:futureWallet,totalBalance:totalWallet},update:{}}),baselineTotal=money(Number(baseline.totalBalance)),growthPercent=calculatePortfolioGrowth(totalWallet,baselineTotal);
    return NextResponse.json({spotWalletBalance:spotWallet.toFixed(2),futureWalletBalance:futureWallet.toFixed(2),futureWalletSource:financial.source,totalWalletBalance:totalWallet.toFixed(2),baselineTotalBalance:baselineTotal.toFixed(2),growthPercent},{headers:{"Cache-Control":"no-store"}})
  }catch{return NextResponse.json({error:"Portfolio unavailable."},{status:401})}
}
