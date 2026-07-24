import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { getKycUser } from "@/lib/kyc/kyc-access.server";
import { KycError, submitKyc } from "@/lib/kyc/kyc-service.server";

const log=(requestId:string,userId:string|null,stage:string,started:number,extra:Record<string,unknown>={})=>console.info("[kyc-upload]",{requestId,userId,stage,duration:Date.now()-started,...extra});
export async function POST(request:Request){
  const requestId=randomUUID(),started=Date.now();let userId:string|null=null,stage="authentication",fileCount=0,mimeTypes:string[]=[],fileSizes:number[]=[];
  try{
    const user=await getKycUser();userId=user.id;log(requestId,userId,stage,started);
    stage="multipart_parsing";const form=await request.formData(),files=["front","back","selfie"].map(name=>form.get(name)).filter((value):value is File=>value instanceof File&&value.size>0);
    fileCount=files.length;mimeTypes=files.map(file=>file.type);fileSizes=files.map(file=>file.size);log(requestId,userId,stage,started,{fileCount,mimeTypes,fileSizes});
    stage="storage_and_record";const result=await submitKyc(user,form);
    log(requestId,userId,"response",started,{httpStatus:200,safeErrorCode:null});
    return NextResponse.json(result,{headers:{"X-Request-Id":requestId}});
  }catch(error){
    let status=500,code="KYC_SUBMISSION_FAILED",message="KYC submission could not be saved. Please retry.";
    if(error instanceof KycError){status=error.status;code=error.code;message=error.message}
    else if(error instanceof ZodError){status=400;code="INVALID_KYC_INFORMATION";message="Invalid KYC information."}
    else if(error instanceof Error&&error.message==="UNAUTHENTICATED"){status=401;code="UNAUTHENTICATED";message="Your session has expired. Sign in and try again."}
    else if(error instanceof Error&&/required|8 MB|JPEG|PNG|WEBP|filename|content does not match/i.test(error.message)){status=400;code="INVALID_KYC_FILE";message=error.message}
    console.error("[kyc-upload]",{requestId,userId,stage,fileCount,mimeTypes,fileSizes,httpStatus:status,safeErrorCode:code,duration:Date.now()-started});
    return NextResponse.json({error:message,code,requestId},{status,headers:{"X-Request-Id":requestId}});
  }
}
