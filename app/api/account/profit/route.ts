import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { getUserProfit } from "@/lib/profit-service.server";

export async function GET(){try{const user=await requireAuthenticatedUser();return NextResponse.json(await getUserProfit(user.id),{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Unable to load profit."},{status:401})}}
