import { NextResponse } from "next/server";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { adminAuthorizationResponse } from "@/lib/auth/admin-authorization";
export async function GET(){try{return NextResponse.json({authenticated:true,admin:await requireDemoAdmin()},{headers:{"Cache-Control":"private, no-store"}})}catch(error){const authorization=adminAuthorizationResponse(error);if(authorization)return NextResponse.json({authenticated:false,error:authorization.error,code:authorization.reason},{status:authorization.status,headers:{"Cache-Control":"private, no-store"}});return NextResponse.json({authenticated:false,error:"Unable to verify session."},{status:500,headers:{"Cache-Control":"private, no-store"}})}}
