import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const input=z.object({subject:z.string().trim().min(3).max(120),category:z.enum(["ACCOUNT","DEPOSIT","WITHDRAWAL","TRADING","TECHNICAL","OTHER"]),message:z.string().trim().min(10).max(4000)}).strict();
const ticketView=(ticket:{id:string;subject:string;category:string;message:string;status:string;adminReply:string|null;createdAt:Date;updatedAt:Date})=>({...ticket,createdAt:ticket.createdAt.getTime(),updatedAt:ticket.updatedAt.getTime()});
export async function GET(){try{const user=await requireAuthenticatedUser(),[tickets,configuration]=await Promise.all([prisma.supportTicket.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:100}),prisma.supportConfiguration.findUnique({where:{id:"default"}})]);return NextResponse.json({tickets:tickets.map(ticketView),contact:configuration?{email:configuration.supportEmail,whatsappUrl:configuration.whatsappUrl,telegramUrl:configuration.telegramUrl,helpCenterUrl:configuration.helpCenterUrl}:null},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
export async function POST(request:Request){try{const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),ticket=await prisma.supportTicket.create({data:{userId:user.id,...value}});return NextResponse.json({ticket:ticketView(ticket),message:"Support ticket submitted."},{status:201})}catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message??"Invalid ticket."},{status:400});return NextResponse.json({error:"Unable to submit support ticket."},{status:500})}}
