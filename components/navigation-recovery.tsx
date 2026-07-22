"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const RECOVERY_KEY="bitvora:chunk-recovery";
const chunkFailure=(value:unknown)=>{const message=value instanceof Error?`${value.name} ${value.message}`:String(value??"");return /ChunkLoadError|Loading chunk [\d-]+ failed|Failed to fetch dynamically imported module|CSS_CHUNK_LOAD_FAILED|_next\/static/i.test(message)};
let previousPathname="";
const safeText=(value:unknown,limit:number)=>String(value??"").replace(/[\r\n\t]+/g," ").slice(0,limit);
const report=(value:unknown)=>{const error=value instanceof Error?value:new Error(safeText(value,500)),buildId=document.querySelector<HTMLMetaElement>('meta[name="bitvora-build"]')?.content??"unknown",payload={name:safeText(error.name,80),message:safeText(error.message,500),stack:String(error.stack??"").slice(0,6000),pathname:location.pathname,previousPathname,buildId:safeText(buildId,160),userAgent:safeText(navigator.userAgent,500),timestamp:new Date().toISOString()};void fetch("/api/client-errors",{method:"POST",credentials:"same-origin",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(payload)}).catch(()=>{})};

export function NavigationRecovery(){
  const pathname=usePathname();
  useEffect(()=>{const current=pathname,recover=(value:unknown)=>{report(value);if(!chunkFailure(value))return;const marker=`${location.pathname}${location.search}`;if(sessionStorage.getItem(RECOVERY_KEY)===marker)return;sessionStorage.setItem(RECOVERY_KEY,marker);location.reload()},onError=(event:ErrorEvent)=>recover(event.error??event.message),onRejection=(event:PromiseRejectionEvent)=>recover(event.reason),settled=setTimeout(()=>sessionStorage.removeItem(RECOVERY_KEY),15_000);if(!previousPathname)previousPathname=document.referrer?new URL(document.referrer).pathname:"";window.addEventListener("error",onError);window.addEventListener("unhandledrejection",onRejection);return()=>{previousPathname=current;clearTimeout(settled);window.removeEventListener("error",onError);window.removeEventListener("unhandledrejection",onRejection)}},[pathname]);return null
}
