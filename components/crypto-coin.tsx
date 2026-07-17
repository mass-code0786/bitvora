"use client";
import { motion } from "framer-motion";
import { CURRENCY_SYMBOL } from "@/lib/currency";

type CoinSymbol = "BTC" | "ETH" | "BNB" | "USDT";
const glyphs: Record<CoinSymbol, string> = { BTC: "₿", ETH: "◆", BNB: "◇", USDT: "₮" };

export function CryptoCoin({ symbol, size = "md", className = "" }: { symbol: CoinSymbol; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const label = symbol === "USDT" ? CURRENCY_SYMBOL : symbol;
  return <motion.span animate={{y:[0,-7,0],rotateZ:[0,1.5,0]}} transition={{duration:4.8,repeat:Infinity,ease:"easeInOut",delay:symbol.length*.17}} whileHover={{scale:1.08,rotateY:8}} className={`crypto-coin coin-${symbol.toLowerCase()} coin-${size} ${className}`} aria-label={label}><span className="coin-rim"><span className="coin-face"><i>{glyphs[symbol]}</i><small>{label}</small></span></span></motion.span>;
}

export function CoinScene({ compact = false }: { compact?: boolean }) {
  return <div className={`coin-scene ${compact ? "coin-scene-compact" : ""}`} aria-hidden="true"><div className="scene-halo"/><div className="coin-platform"/><CryptoCoin symbol="ETH" size={compact ? "lg" : "xl"} className="scene-eth"/><CryptoCoin symbol="BTC" size={compact ? "md" : "lg"} className="scene-btc"/><CryptoCoin symbol="BNB" size="sm" className="scene-bnb"/><CryptoCoin symbol="USDT" size="sm" className="scene-usdt"/><span className="scene-particle particle-a"/><span className="scene-particle particle-b"/><span className="scene-particle particle-c"/></div>;
}
