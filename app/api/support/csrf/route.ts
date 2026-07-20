import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { issueCsrfToken } from "@/lib/support-security.server";
export async function GET(){try{const user=await requireAuthenticatedUser();return NextResponse.json({token:issueCsrfToken(user.id)},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Unable to issue a security token."},{status:401})}}

