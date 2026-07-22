import { NextResponse } from "next/server";
import { z } from "zod";

const reportSchema=z.object({name:z.string().max(80),message:z.string().max(500),stack:z.string().max(6000),pathname:z.string().max(300),previousPathname:z.string().max(300),buildId:z.string().max(160),userAgent:z.string().max(500),timestamp:z.string().datetime()});
const clean=(value:string)=>value.replace(/https?:\/\/[^\s)]+/gi,url=>{try{const parsed=new URL(url);return`${parsed.origin}${parsed.pathname}`}catch{return"[url]"}}).replace(/(token|secret|password|cookie|authorization)=?[^\s&]*/gi,"$1=[redacted]");

export async function POST(request:Request){try{if(request.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({code:"CROSS_SITE_REPORT_REJECTED"},{status:403});const length=Number(request.headers.get("content-length")??0);if(length>16_384)return NextResponse.json({code:"CLIENT_ERROR_REPORT_TOO_LARGE"},{status:413});const value=reportSchema.parse(await request.json());console.error("[client-navigation-error]",{...value,message:clean(value.message),stack:clean(value.stack)});return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({code:"INVALID_CLIENT_ERROR_REPORT"},{status:400,headers:{"Cache-Control":"no-store"}})}}
