import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root=resolve(process.cwd()),chart=readFileSync(resolve(root,"components/tradingview-compact-chart.tsx"),"utf8"),loader=readFileSync(resolve(root,"lib/tradingview-loader.ts"),"utf8"),layout=readFileSync(resolve(root,"app/layout.tsx"),"utf8");
describe("Copy Trading chart loading contract",()=>{
  it("uses a shared singleton TradingView loader",()=>{expect(loader).toContain("let loader:Promise<void>|null=null");expect(loader).toContain("bitvora-tradingview-widget-script");expect(chart).toContain("loadTradingView()")});
  it("mounts immediately without visibility or trading-state dependencies",()=>{expect(chart).not.toContain("IntersectionObserver");expect(chart).not.toContain("Date.now()");expect(chart).toContain("[attempt,interval,studies]");expect(chart).toContain("memo(CompactChart)")});
  it("shows an immediate skeleton and bounded retry fallback",()=>{expect(chart).toContain("copy-chart-skeleton");expect(chart).toContain("7000");expect(chart).toContain("Live chart is taking longer than expected.");expect(chart).toContain("Retry");expect(chart).toContain("Open simplified chart")});
  it("preconnects and preloads the single global script",()=>{expect(layout).toContain('rel="preconnect"');expect(layout).toContain('href="https://s3.tradingview.com/tv.js"');expect(layout).toContain('as="script"')});
});
