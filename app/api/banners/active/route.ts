import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { activeBanner } from "@/lib/banner/banner-service.server";
export async function GET(){try{await requireAuthenticatedUser();const banner=await activeBanner();return NextResponse.json({banner:banner?{id:banner.id,title:banner.title,imageUrl:banner.imageUrl,width:banner.width,height:banner.height}:null},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Authentication required."},{status:401})}}
