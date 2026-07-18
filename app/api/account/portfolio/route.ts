import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { migrateWalletStore, money } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";

const localDate=(timestamp:number,timezone:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(timestamp));

export async function GET(){
  try{
    const authUser=await requireAuthenticatedUser(),user=await prisma.user.findUnique({where:{id:authUser.id},select:{timezone:true,state:{select:{wallet:true}}}});
    if(!user)throw new Error("UNAUTHENTICATED");
    const timezone=user.timezone||"UTC",today=localDate(Date.now(),timezone),wallet=migrateWalletStore(user.state?.wallet),spotWallet=money(wallet.wallets.spot.balance),futureWallet=money(wallet.wallets.future.balance),totalWallet=money(spotWallet+futureWallet);
    const previous=await prisma.$transaction(async transaction=>{
      const baseline=await transaction.portfolioSnapshot.findFirst({where:{userId:authUser.id,localDate:{lt:today}},orderBy:{localDate:"desc"}});
      await transaction.portfolioSnapshot.upsert({where:{userId_localDate:{userId:authUser.id,localDate:today}},create:{userId:authUser.id,localDate:today,timezone,spotBalance:spotWallet,futureBalance:futureWallet,totalBalance:totalWallet},update:{}});
      return baseline;
    });
    const previousTotal=previous?Number(previous.totalBalance):null,growthPercent=totalWallet===0||previousTotal===null||previousTotal<=0?null:Number((((totalWallet-previousTotal)/previousTotal)*100).toFixed(2));
    return NextResponse.json({spotWallet,futureWallet,totalWallet,growthPercent,baselineDate:previous?.localDate??null},{headers:{"Cache-Control":"no-store"}})
  }catch{return NextResponse.json({error:"Portfolio unavailable."},{status:401})}
}
