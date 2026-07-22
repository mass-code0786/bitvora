import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const defaults={emailNotifications:true,pushNotifications:true,tradeNotifications:true};
const input=z.object({emailNotifications:z.boolean(),pushNotifications:z.boolean(),tradeNotifications:z.boolean()}).strict();
const view=(value:typeof defaults)=>({emailNotifications:value.emailNotifications,pushNotifications:value.pushNotifications,tradeNotifications:value.tradeNotifications});

export async function GET(){try{const user=await requireAuthenticatedUser(),record=await prisma.userPreference.findUnique({where:{userId:user.id}});return NextResponse.json({settings:view(record??defaults)},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
export async function PUT(request:Request){try{const user=await requireAuthenticatedUser(),value=input.parse(await request.json()),record=await prisma.userPreference.upsert({where:{userId:user.id},create:{userId:user.id,...value},update:value});return NextResponse.json({settings:view(record),message:"Settings saved."})}catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message??"Invalid settings."},{status:400});return NextResponse.json({error:"Unable to save settings."},{status:500})}}
