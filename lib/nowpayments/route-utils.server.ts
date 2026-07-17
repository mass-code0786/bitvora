import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NowPaymentsError } from "./client.server";
export function depositApiError(error:unknown){if(error instanceof ZodError)return NextResponse.json({error:"Invalid deposit request.",code:"VALIDATION_ERROR",issues:error.issues.map(item=>({path:item.path.join("."),message:item.message}))},{status:400});if(error instanceof NowPaymentsError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});if(error instanceof Error&&error.message==="UNAUTHENTICATED")return NextResponse.json({error:"Authentication required.",code:"UNAUTHENTICATED"},{status:401});return NextResponse.json({error:"Deposit service request failed.",code:"INTERNAL_ERROR"},{status:500})}
