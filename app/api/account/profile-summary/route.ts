import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { canonicalDirectMemberWhere } from "@/lib/direct-members";
import { prisma } from "@/lib/prisma";

export async function GET(){
  try{
    const user=await requireAuthenticatedUser(),rows=await prisma.$queryRaw<Array<{directCount:bigint}>>`
      SELECT COUNT(DISTINCT u."id")::bigint "directCount"
      FROM "User" u
      WHERE ${canonicalDirectMemberWhere(user)}
    `;
    return NextResponse.json({directCount:Number(rows[0]?.directCount??0)},{headers:{"Cache-Control":"private, no-store"}});
  }catch{
    return NextResponse.json({error:"Profile summary unavailable."},{status:401});
  }
}
