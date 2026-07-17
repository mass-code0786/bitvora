import { NextResponse } from "next/server";
export async function POST(){return NextResponse.json({error:"Use authenticated credentials through Auth.js."},{status:410})}
