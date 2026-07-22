import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8"),middleware=read("middleware.ts"),layout=read("app/(app)/layout.tsx"),shell=read("components/app-shell.tsx"),recovery=read("components/navigation-recovery.tsx"),errorBoundary=read("app/(app)/error.tsx"),chart=read("components/tradingview-compact-chart.tsx");
describe("client navigation resilience",()=>{
  it("never caches documents, APIs, or RSC responses as immutable",()=>{expect(middleware).toContain("private, no-store, max-age=0, must-revalidate");expect(middleware).toContain("Next-Router-State-Tree");expect(middleware).toContain("_next/static");expect(layout).toContain('dynamic="force-dynamic"');expect(layout).toContain("revalidate=0")});
  it("preserves hashed static assets outside middleware",()=>{expect(middleware).toContain("(?!_next/static|_next/image")});
  it("uses valid stable internal links",()=>{for(const route of ["/home","/markets","/trade","/team","/profile","/settings","/support"])expect(shell).toContain(`href:\"${route}\"`)});
  it("recovers a stale chunk only once and provides a safe route error boundary",()=>{expect(recovery).toMatch(/ChunkLoadError/);expect(recovery).toContain("sessionStorage.getItem");expect(recovery).toContain("location.reload()");expect(shell).toContain("<NavigationRecovery/>");expect(errorBoundary).toContain("Retry");expect(errorBoundary).not.toContain("error.message")});
  it("cleans up TradingView without assuming its host is still mounted",()=>{expect(chart).toContain("if(host.isConnected)host.replaceChildren()")});
  it("reports only bounded diagnostic metadata",()=>{const endpoint=read("app/api/client-errors/route.ts"),config=read("next.config.ts");expect(endpoint).toContain("CLIENT_ERROR_REPORT_TOO_LARGE");expect(endpoint).toContain("[client-navigation-error]");expect(endpoint).not.toMatch(/wallet|chat|cookie:/i);expect(recovery).toContain('fetch("/api/client-errors"');expect(config).toContain("generateBuildId")});
});
