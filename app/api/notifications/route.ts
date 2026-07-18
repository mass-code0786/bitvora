import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { migrateTradingStore } from "@/lib/ai-trading-engine";
import { prisma } from "@/lib/prisma";

export async function GET(){try{const user=await requireAuthenticatedUser();const[records,state]=await Promise.all([prisma.userNotification.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:100}),prisma.userState.findUnique({where:{userId:user.id},select:{trading:true}})]);const persisted=records.map(item=>({id:item.id,title:item.title,message:item.message,type:item.type,createdAt:item.createdAt.getTime()})),trading=migrateTradingStore(state?.trading).notifications.filter(item=>item.userId===user.id).map(item=>({id:item.id,title:item.title,message:item.text,type:item.kind.toUpperCase(),createdAt:item.createdAt})),notifications=[...persisted,...trading].sort((a,b)=>b.createdAt-a.createdAt);return NextResponse.json({notifications},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
