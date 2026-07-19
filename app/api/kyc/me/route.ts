import { NextResponse } from "next/server";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { getSafeKycForUser } from "@/lib/kyc/kyc-service.server";
import { prisma } from "@/lib/prisma";
import { formatUserTimestamp, resolveUserTimeZone } from "@/lib/timezone.server";
export async function GET(){const user=await getKycUser(),[kyc,profile]=await Promise.all([getSafeKycForUser(user.id),prisma.user.findUnique({where:{id:user.id},select:{timezone:true,country:true}})]),timeZone=resolveUserTimeZone(profile?.timezone,profile?.country);return NextResponse.json({...kyc,reviewedLocalDateTime:"reviewedAt" in kyc&&kyc.reviewedAt?formatUserTimestamp(kyc.reviewedAt,timeZone).localDateTime:null,notifications:kyc.notifications.map(item=>({...item,...formatUserTimestamp(item.createdAt,timeZone)}))},{headers:{"Cache-Control":"no-store"}})}
