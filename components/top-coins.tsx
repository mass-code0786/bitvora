"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";
import { Sparkline } from "@/components/charts";
import { useMarketData } from "@/hooks/use-market-data";
import { COIN_CATALOGUE } from "@/lib/coins";
import { formatCurrency } from "@/lib/currency";
import type { MarketCoin } from "@/lib/market-service";

const TOP_SYMBOLS=["BTC","ETH","BNB","SOL"];
const TOP_COINS=TOP_SYMBOLS.map(symbol=>COIN_CATALOGUE.find(coin=>coin.symbol===symbol)).filter((coin):coin is NonNullable<typeof coin>=>Boolean(coin));

const TopCoinCard=memo(function TopCoinCard({coin}:{coin:MarketCoin}){
  const[logoError,setLogoError]=useState(false),positive=coin.change>=0,color=positive?"#43d79b":"#f06478";
  return <Link href={`/markets/${coin.symbol.toLowerCase()}`} className="top-coin-card" aria-label={`Open ${coin.pair} market`}>
    <div className="top-coin-identity">{logoError?<span>{coin.symbol.slice(0,2)}</span>:<Image src={coin.logo} alt={`${coin.name} logo`} width={34} height={34} unoptimized onError={()=>setLogoError(true)}/>}<div><strong>{coin.symbol}</strong><small>{coin.name}</small></div></div>
    <div className="top-coin-quote" aria-live="polite"><strong>{coin.isLive?formatCurrency(coin.price,{maximumFractionDigits:coin.price<1?6:2}):"$—"}</strong><span className={positive?"positive":"negative"}>{positive?"+":""}{coin.change.toFixed(2)}%</span></div>
    <div className="top-coin-spark" aria-hidden="true"><Sparkline data={coin.sparkline} color={color}/></div>
  </Link>;
});

export function TopCoins(){
  const{markets}=useMarketData(TOP_COINS,TOP_SYMBOLS);
  return <section className="top-coins" aria-labelledby="top-coins-title"><div className="top-coins-heading"><div><small>Live market</small><h2 id="top-coins-title">Top Coins</h2></div><Link href="/markets">View all</Link></div><div className="top-coins-grid">{markets.map(coin=><TopCoinCard coin={coin} key={coin.symbol}/>)}</div></section>;
}
