import { describe, expect, it } from "vitest";
import { COIN_CATALOGUE, getCoin } from "@/lib/coins";

describe("TradingView market symbols", () => {
  it.each(["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE"])("maps %s to its Binance USDT chart", (symbol) => {
    expect(getCoin(symbol)?.tradingViewSymbol).toBe(`BINANCE:${symbol}USDT`);
  });

  it("maps every supported market", () => {
    expect(COIN_CATALOGUE.length).toBeGreaterThan(0);
    expect(COIN_CATALOGUE.every((coin) => coin.tradingViewSymbol === `BINANCE:${coin.symbol}USDT`)).toBe(true);
    expect(new Set(COIN_CATALOGUE.map((coin) => coin.tradingViewSymbol)).size).toBe(COIN_CATALOGUE.length);
  });
});
