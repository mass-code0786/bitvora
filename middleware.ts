import { NextResponse } from "next/server";

export function middleware(){
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma","no-cache");
  response.headers.set("Expires","0");
  const vary=response.headers.get("Vary");
  response.headers.set("Vary",[vary,"RSC","Next-Router-State-Tree","Next-Router-Prefetch","Next-Url"].filter(Boolean).join(", "));
  return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]};
