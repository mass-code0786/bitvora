import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SUPPORT_MESSAGE_LIMIT=4000;
export const SUPPORT_ATTACHMENT_LIMIT=Math.min(5*1024*1024,Math.max(1024,Number(process.env.SUPPORT_ATTACHMENT_MAX_BYTES)||5*1024*1024));
export const SUPPORT_ATTACHMENT_TYPES=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);
const TOKEN_TTL_MS=2*60*60*1000;
const secret=()=>process.env.AUTH_SECRET||process.env.NEXTAUTH_SECRET||"";
const signature=(payload:string)=>createHmac("sha256",secret()).update(payload).digest("hex");

export function issueCsrfToken(userId:string,now=Date.now()){
  if(!secret())throw new Error("CSRF_NOT_CONFIGURED");
  const payload=`${userId}.${now+TOKEN_TTL_MS}`;return`${payload}.${signature(payload)}`;
}
export function verifyCsrfToken(token:string|null,userId:string,now=Date.now()){
  if(!token||!secret())return false;const parts=token.split(".");if(parts.length!==3||parts[0]!==userId)return false;const expires=Number(parts[1]);if(!Number.isFinite(expires)||expires<now)return false;const payload=`${parts[0]}.${parts[1]}`,expected=Buffer.from(signature(payload)),actual=Buffer.from(parts[2]);return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export function assertMutationRequest(request:Request,userId:string){
  const url=new URL(request.url),origin=request.headers.get("origin"),site=request.headers.get("sec-fetch-site"),mode=request.headers.get("sec-fetch-mode");
  if(origin&&origin!==url.origin)throw new Error("INVALID_ORIGIN");
  if(site&&site!=="same-origin")throw new Error("INVALID_FETCH_SITE");
  if(mode&&!new Set(["cors","same-origin"]).has(mode))throw new Error("INVALID_FETCH_MODE");
  if(!origin&&!site)throw new Error("MISSING_REQUEST_PROVENANCE");
  if(!verifyCsrfToken(request.headers.get("x-csrf-token"),userId))throw new Error("INVALID_CSRF_TOKEN");
}
