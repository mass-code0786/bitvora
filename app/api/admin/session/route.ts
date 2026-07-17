import { NextResponse } from "next/server";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
export async function GET(){try{return NextResponse.json({authenticated:true,admin:await requireDemoAdmin()})}catch{return NextResponse.json({authenticated:false},{status:401})}}
