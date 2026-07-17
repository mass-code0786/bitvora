/* CoinCap serves the catalogue logos directly; native img avoids coupling to image-host configuration. */
/* eslint-disable @next/next/no-img-element */
"use client";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import type { CoinDefinition } from "@/lib/coins";
import { formatCurrency } from "@/lib/currency";
import { useMarketData } from "@/hooks/use-market-data";
import { Sparkline } from "./charts";

export function CoinDetail({coin}:{coin:CoinDefinition}){const catalogue=useMemo(()=>[coin],[coin]);const symbols=useMemo(()=>[coin.symbol],[coin.symbol]);const {markets,loading,fallback,streaming,refresh}=useMarketData(catalogue,symbols);const market=markets[0];const positive=market.change>=0;
  return <><Link href="/markets" className="market-back"><ArrowLeft size={16}/> All markets</Link><section className="coin-detail-hero"><div className="coin-detail-title"><img src={coin.logo} alt={`${coin.name} logo`}/><div><span>{coin.pair}</span><h1>{coin.name}</h1><p>{streaming?<Wifi size={12}/>:<WifiOff size={12}/>} {fallback?"Demo fallback":"Live public market data"}</p></div></div><button onClick={()=>void refresh()}>{loading?"Refreshing…":"Refresh"}</button><div className="coin-detail-price"><strong>{formatCurrency(market.price,{maximumFractionDigits:market.price<1?6:2})}</strong><span className={positive?"positive":"negative"}>{positive?"+":""}{market.change.toFixed(2)}%</span></div><div className="coin-detail-chart"><Sparkline data={market.sparkline} color={positive?"#43d79b":"#f06478"}/></div><div className="coin-detail-stats"><div><span>24h volume</span><strong>{formatCurrency(market.volume,{notation:"compact",maximumFractionDigits:2})}</strong></div><div><span>24h high</span><strong>{formatCurrency(market.high,{maximumFractionDigits:market.high<1?6:2})}</strong></div><div><span>24h low</span><strong>{formatCurrency(market.low,{maximumFractionDigits:market.low<1?6:2})}</strong></div></div></section><div className="demo-trade-panel"><ShieldAlert size={18}/><div><strong>Trading is demo-only</strong><p>Order execution is not available in this frontend preview.</p></div><button disabled>Buy</button><button disabled>Sell</button></div></>}
