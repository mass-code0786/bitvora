import { NextResponse } from "next/server";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { prisma } from "@/lib/prisma";
import { withdrawalResponse } from "@/lib/withdrawals/types";
export async function GET(){const user=await getKycUser(),rows=await prisma.withdrawal.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:100});return NextResponse.json({withdrawals:rows.map(withdrawalResponse)},{headers:{"Cache-Control":"no-store"}})}
