import { NextResponse } from "next/server";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { prisma } from "@/lib/prisma";
import { BannerError, createBanner, replaceBannerFile } from "@/lib/banner/banner-service.server";
export const runtime="nodejs";
export async function GET(){try{await requireDemoAdmin();const banners=await prisma.banner.findMany({orderBy:{createdAt:"desc"}});return NextResponse.json({banners},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Admin access required."},{status:401})}}
export async function POST(request:Request){try{const admin=await requireDemoAdmin(),form=await request.formData(),replaceId=String(form.get("replaceId")??""),banner=replaceId?await replaceBannerFile(replaceId,admin.id,form):await createBanner(admin.id,form);return NextResponse.json({banner},{status:replaceId?200:201})}catch(error){return NextResponse.json({error:error instanceof BannerError?error.message:"We could not process this image. Please try another JPG, PNG, or WEBP file."},{status:error instanceof BannerError?error.status:500})}}
