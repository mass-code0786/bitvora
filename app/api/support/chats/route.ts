import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { decodeCursor, encodeCursor, pageSize } from "@/lib/support-pagination";
export async function GET(request:Request){try{const user=await requireAuthenticatedUser(),url=new URL(request.url),take=pageSize(url.searchParams.get("limit")),cursor=decodeCursor(url.searchParams.get("cursor")),rows=await prisma.chatSession.findMany({where:{userId:user.id,deletedAt:null,...(cursor?{OR:[{lastMessageAt:{lt:cursor.at}},{lastMessageAt:cursor.at,id:{lt:cursor.id}}]}:{})},orderBy:[{lastMessageAt:"desc"},{id:"desc"}],select:{id:true,title:true,unreadCount:true,lastMessageAt:true,createdAt:true,_count:{select:{messages:true}}},take:take+1}),hasMore=rows.length>take,sessions=hasMore?rows.slice(0,take):rows,last=sessions.at(-1);return NextResponse.json({sessions,nextCursor:hasMore&&last?encodeCursor(last.lastMessageAt,last.id):null},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}

