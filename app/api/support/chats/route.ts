import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export async function GET(){try{const user=await requireAuthenticatedUser(),sessions=await prisma.chatSession.findMany({where:{userId:user.id,deletedAt:null},orderBy:{lastMessageAt:"desc"},select:{id:true,title:true,unreadCount:true,lastMessageAt:true,createdAt:true,_count:{select:{messages:true}}},take:100});return NextResponse.json({sessions},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}

