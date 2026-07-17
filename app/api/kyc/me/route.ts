import { NextResponse } from "next/server";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { getSafeKycForUser } from "@/lib/kyc/kyc-service.server";
export async function GET(){const user=await getKycUser();return NextResponse.json(await getSafeKycForUser(user.id),{headers:{"Cache-Control":"no-store"}})}
