import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const copy=fs.readFileSync(path.join(process.cwd(),"components/copy-trading-module.tsx"),"utf8"),chart=fs.readFileSync(path.join(process.cwd(),"components/tradingview-compact-chart.tsx"),"utf8");

describe("AI Copy Trading frontend layout",()=>{
  it("keeps the requested heading and wallet data while removing obsolete headings",()=>{
    expect(copy).toContain('eyebrow="AI Copy Trading"');
    expect(copy).not.toContain("Trade workspace");
    expect(copy).not.toContain("Future Wallet Balance");
    expect(copy).toContain("FUTURE WALLET");
    expect(copy).toContain("summary.balance");
    expect(copy).toContain("todayNetChange");
  });

  it("places one compact BTC chart between the wallet and session card",()=>{
    expect(copy).toMatch(/future-wallet-hero[\s\S]*<TradingViewCompactChart\/><CurrentSessionCard[\s\S]*<TradeHistory/);
    expect(copy.match(/<TradingViewCompactChart\/>/g)).toHaveLength(1);
  });

  it("uses a live dark one-minute candlestick widget without trading clutter",()=>{
    expect(chart).toContain('symbol:"BINANCE:BTCUSDT"');
    expect(chart).toContain('interval:"1"');
    expect(chart).toContain('style:"1"');
    expect(chart).toContain('theme:"dark"');
    expect(chart).toContain('hide_side_toolbar:true');
    expect(chart).toContain('hide_top_toolbar:true');
    expect(chart).not.toContain("Order Book");
    expect(chart).not.toContain("Buy");
    expect(chart).not.toContain("Sell");
    expect(chart).toContain("host.replaceChildren()");
    expect(chart).toContain("},[])");
  });
});
