import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const copy=fs.readFileSync(path.join(process.cwd(),"components/copy-trading-module.tsx"),"utf8"),chart=fs.readFileSync(path.join(process.cwd(),"components/tradingview-compact-chart.tsx"),"utf8"),api=fs.readFileSync(path.join(process.cwd(),"app/api/ai-trading/route.ts"),"utf8"),compat=fs.readFileSync(path.join(process.cwd(),"lib/trade-history-compat.server.ts"),"utf8"),walletHistory=fs.readFileSync(path.join(process.cwd(),"components/wallet-history-module.tsx"),"utf8");

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
    expect(copy).toMatch(/future-wallet-hero[\s\S]*<TradingViewCompactChart\/><CurrentSessionCard[\s\S]*<CurrentTrades[\s\S]*<TradeHistory/);
    expect(copy.match(/<TradingViewCompactChart\/>/g)).toHaveLength(1);
  });

  it("removes the schedule card and keeps only the session name, countdown, and authorized Trade button",()=>{
    expect(copy).not.toContain("No eligible session");
    expect(copy).not.toContain("The next eligible session will appear automatically.");
    expect(copy).toContain('session.status==="LIVE"&&session.eligible');
    expect(copy).not.toContain("Today&apos;s sessions");
    expect(copy).not.toContain("SessionSchedule");
    expect(copy).toContain("countdownTarget-now");
    expect(copy).not.toMatch(/session\.displayStartTime[\s\S]{0,80}session\.status/);
    expect(copy).toMatch(/<span>\{session\?\.type[\s\S]*<small>\{countdown\}<\/small>/);
    expect(copy).toMatch(/<button disabled={!canTrade} onClick={onTrade}>Trade<\/button>/);
  });

  it("renders server-grouped current and historical trades without overlap",()=>{
    expect(copy).toContain("Current Trades");
    expect(copy).toContain("Trade History");
    expect(copy).toContain("No active trades.");
    expect(copy).toContain("No trade history.");
    expect(api).toContain("currentTrades=groupedTrades.filter(item=>item.isCurrent)");
    expect(api).toContain("tradeHistory=groupedTrades.filter(item=>!item.isCurrent)");
    expect(api).toContain("loadVisibleTradeHistory");
    expect(compat).toContain("settledAt:trade.officialSettledAt");
    expect(copy).toContain("formatLocalDateTime(trade.settledAt)");
  });

  it("uses user-facing trade statuses without exposing principal accounting",()=>{
    expect(copy).toContain('CAPITAL_LOCKED:"Active"');
    expect(copy).toContain('PENDING_SETTLEMENT:"Active"');
    expect(copy).toContain('SETTLING:"Processing"');
    expect(copy).toContain('SETTLED:"Completed"');
    expect(copy).not.toMatch(/capital locked|settlement pending|principal returned/i);
    expect(copy).toContain("Profit received:");
    expect(walletHistory).toContain('item.type!=="AI_TRADE_CAPITAL_LOCKED"');
    expect(walletHistory).toContain('item.type!=="AI_TRADE_PRINCIPAL_RETURNED"');
    expect(walletHistory).not.toContain("<b>{item.type}</b>");
  });

  it("uses a live dark one-minute candlestick widget without trading clutter",()=>{
    expect(chart).toContain('symbol:"BINANCE:BTCUSDT"');
    expect(chart).toContain('interval,studies');
    expect(chart).toContain('style:"1"');
    expect(chart).toContain('theme:"dark"');
    expect(chart).toContain('hide_side_toolbar:true');
    expect(chart).toContain('hide_top_toolbar:true');
    expect(chart).not.toContain("Order Book");
    expect(chart).not.toContain("Buy");
    expect(chart).not.toContain("Sell");
    expect(chart).toContain("host.replaceChildren()");
    expect(chart).toContain("},[attempt,interval,studies])");
  });

  it("shows compact timeframe and TradingView study controls with 1m selected by default",()=>{
    expect(chart).not.toContain("Live market");
    expect(chart).toContain("BTC/USDT");
    expect(chart).toContain('[interval,setIntervalValue]=useState("1")');
    expect(chart).toContain('{label:"1m",value:"1"}');
    expect(chart).toContain('{label:"5m",value:"5"}');
    expect(chart).toContain('{label:"15m",value:"15"}');
    expect(chart).toContain('{label:"1D",value:"D"}');
    expect(chart).toContain("Moving Average");
    expect(chart).toContain("Bollinger Bands");
    expect(chart).toContain("RSI@tv-basicstudies");
    expect(chart).toContain("MACD@tv-basicstudies");
    expect(chart).toContain("Volume@tv-basicstudies");
  });
});
