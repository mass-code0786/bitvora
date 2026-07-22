import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore } from "@/lib/wallet-data";

export async function GET(){try{const current=await requireAuthenticatedUser(),users=await prisma.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true,state:{select:{wallet:true}},financialWallet:{select:{retainedPrincipal:true}}}}),records=users.map(user=>{const wallet=migrateWalletStore(user.state?.wallet),rank=wallet.rankAccount;return{id:user.id,uid:user.uid,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??"",qualifyingFutureCapital:user.financialWallet?Number(user.financialWallet.retainedPrincipal):wallet.totalFuturePrincipal,qualificationSource:user.financialWallet?"RELATIONAL":"LEGACY_COMPATIBILITY",currentStar:rank.currentStar,rewardedRanks:rank.rewardedRanks}});return NextResponse.json({sourceUserId:current.id,records},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
