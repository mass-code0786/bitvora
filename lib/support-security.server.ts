import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SUPPORT_MESSAGE_LIMIT=4000;
export const SUPPORT_ATTACHMENT_LIMIT=Math.min(5*1024*1024,Math.max(1024,Number(process.env.SUPPORT_ATTACHMENT_MAX_BYTES)||5*1024*1024));
export const SUPPORT_ATTACHMENT_TYPES=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);
const TOKEN_TTL_MS=2*60*60*1000,allowedFetchSites=new Set(["same-origin","same-site","none"]),allowedFetchModes=new Set(["cors","same-origin","navigate"]);
const secret=()=>process.env.AUTH_SECRET||process.env.NEXTAUTH_SECRET||"";
const signature=(payload:string)=>createHmac("sha256",secret()).update(payload).digest("hex");
const firstHeader=(value:string|null)=>value?.split(",")[0]?.trim()||null;
const trustProxy=()=>process.env.SUPPORT_TRUST_PROXY==="true";

export class SupportSecurityError extends Error{constructor(public reason:string){super(reason);this.name="SupportSecurityError"}}
export function isSupportSecurityError(error:unknown):error is SupportSecurityError{return error instanceof SupportSecurityError}
export function issueCsrfToken(userId:string,now=Date.now()){if(!secret())throw new Error("CSRF_NOT_CONFIGURED");const payload=`${userId}.${now+TOKEN_TTL_MS}`;return`${payload}.${signature(payload)}`}
export function verifyCsrfToken(token:string|null,userId:string,now=Date.now()){if(!token||!secret())return false;const parts=token.split(".");if(parts.length!==3||parts[0]!==userId)return false;const expires=Number(parts[1]);if(!Number.isFinite(expires)||expires<now)return false;const payload=`${parts[0]}.${parts[1]}`,expected=Buffer.from(signature(payload)),actual=Buffer.from(parts[2]);return expected.length===actual.length&&timingSafeEqual(expected,actual)}

function normalizedOrigin(value:string|null){if(!value)return null;try{const url=new URL(value),protocol=url.protocol.toLowerCase(),hostname=url.hostname.toLowerCase(),port=url.port&&!(protocol==="https:"&&url.port==="443")&&!(protocol==="http:"&&url.port==="80")?`:${url.port}`:"";if(protocol!=="https:"&&protocol!=="http:")return null;return`${protocol}//${hostname}${port}`}catch{return null}}
function configuredOrigin(){return normalizedOrigin(process.env.AUTH_URL??process.env.NEXTAUTH_URL??process.env.NEXT_PUBLIC_APP_URL??null)}
function requestOrigin(request:Request){const url=new URL(request.url);if(!trustProxy())return normalizedOrigin(url.origin)!;const host=firstHeader(request.headers.get("x-forwarded-host"))??request.headers.get("host")??url.host,proto=firstHeader(request.headers.get("x-forwarded-proto"))??url.protocol.replace(":","");return normalizedOrigin(`${proto}://${host}`)??normalizedOrigin(url.origin)!}
function authCookieExists(request:Request){const cookie=request.headers.get("cookie")??"";return/(?:^|;\s*)(?:__Secure-)?(?:authjs|next-auth)\.session-token=/.test(cookie)}
function safeHost(value:string|null){const origin=normalizedOrigin(value);return origin?new URL(origin).host:null}
function diagnostics(request:Request,reason:string){const url=new URL(request.url),origin=request.headers.get("origin"),referer=request.headers.get("referer");console.warn("[support-security]",{requestHost:url.host,originHost:safeHost(origin),refererHost:safeHost(referer),forwardedHost:firstHeader(request.headers.get("x-forwarded-host")),forwardedProtocol:firstHeader(request.headers.get("x-forwarded-proto")),secFetchSite:request.headers.get("sec-fetch-site"),secFetchMode:request.headers.get("sec-fetch-mode"),authCookieExists:authCookieExists(request),rejectionReason:reason})}
function reject(request:Request,reason:string):never{diagnostics(request,reason);throw new SupportSecurityError(reason)}

export function assertMutationRequest(request:Request,userId:string){
  const expected=configuredOrigin()??requestOrigin(request),origin=request.headers.get("origin"),referer=request.headers.get("referer"),site=request.headers.get("sec-fetch-site")?.toLowerCase()??null,mode=request.headers.get("sec-fetch-mode")?.toLowerCase()??null,dest=request.headers.get("sec-fetch-dest")?.toLowerCase()??null;
  if(origin&&normalizedOrigin(origin)!==expected)reject(request,"INVALID_ORIGIN");
  if(!origin&&referer&&normalizedOrigin(referer)!==expected)reject(request,"INVALID_REFERER");
  if(site==="cross-site")reject(request,"INVALID_FETCH_SITE");
  if(site&&!allowedFetchSites.has(site))reject(request,"INVALID_FETCH_SITE");
  if(mode&&!allowedFetchModes.has(mode))reject(request,"INVALID_FETCH_MODE");
  if(dest&&dest!=="empty")reject(request,"INVALID_FETCH_DEST");
  if(!verifyCsrfToken(request.headers.get("x-csrf-token"),userId))reject(request,"INVALID_CSRF_TOKEN");
  if(!origin&&!referer){if(!authCookieExists(request))reject(request,"MISSING_AUTH_COOKIE");if(site&&site!=="same-origin"&&site!=="same-site")reject(request,"MISSING_REQUEST_PROVENANCE")}
}
