import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export async function GET(){try{const current=await requireAuthenticatedUser(),users=await prisma.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true,state:{select:{wallet:true}},financialWallet:{select:{retainedPrincipal:true}}}}),records=users.map(user=>{const wallet=user.state?.wallet as {rankAccount?:{currentStar?:number;rewardedRanks?:number[]}}|undefined,rank=wallet?.rankAccount;return{id:user.id,uid:user.uid,sponsorId:user.sponsorId??"",sponsorUid:user.sponsorUid??"",qualifyingFutureCapital:Number(user.financialWallet?.retainedPrincipal.toString()??0),currentStar:rank?.currentStar??0,rewardedRanks:rank?.rewardedRanks??[]}});return NextResponse.json({sourceUserId:current.id,records},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
