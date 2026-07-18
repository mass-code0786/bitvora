import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { activeBanner, bannerBytes } from "@/lib/banner/banner-service.server";
export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireAuthenticatedUser(),id=(await params).id,banner=user.role==="ADMIN"?await prisma.banner.findUnique({where:{id}}):await activeBanner();if(!banner||banner.id!==id)return new NextResponse(null,{status:404});return new NextResponse(await bannerBytes(banner.imagePath),{headers:{"Content-Type":banner.mimeType,"Content-Length":String(banner.fileSize),"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; img-src 'self'"}})}catch{return new NextResponse(null,{status:403})}}
