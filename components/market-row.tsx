/* CoinCap serves the catalogue logos directly; native img preserves runtime fallbacks. */
/* eslint-disable @next/next/no-img-element */
"use client";
import { memo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { MarketCoin } from "@/lib/market-service";
import { Sparkline } from "./charts";

export const MarketRow=memo(function MarketRow({coin,favourite,onFavourite}:{coin:MarketCoin;favourite:boolean;onFavourite:(symbol:string)=>void}){
  const [logoError,setLogoError]=useState(false); const direction=coin.change>0?"positive":coin.change<0?"negative":"text-slate-400",color=direction==="positive"?"#43d79b":direction==="negative"?"#f06478":"#7d8291";
  return <article className="market-list-row"><Link href={`/markets/${coin.symbol.toLowerCase()}`} className="market-row-link" aria-label={`Open ${coin.name} market`}><div className="market-identity">{logoError?<span className="market-logo-fallback">{coin.symbol.slice(0,2)}</span>:<img src={coin.logo} alt={`${coin.name} logo`} loading="lazy" onError={()=>setLogoError(true)}/>}<div><strong>{coin.symbol}</strong><span>{coin.name}</span><small>{coin.pair}</small></div></div><div className="market-spark"><Sparkline data={coin.sparkline} color={color}/></div><div className="market-quote"><strong>{formatCurrency(coin.price,{maximumFractionDigits:coin.price<1?6:2})}</strong><span className={direction}>{coin.change>0?"+":""}{coin.change.toFixed(2)}%</span><small>Vol {formatCurrency(coin.volume,{notation:"compact",maximumFractionDigits:1})}</small></div></Link><button className={favourite?"market-star active":"market-star"} onClick={()=>onFavourite(coin.symbol)} aria-label={`${favourite?"Remove":"Add"} ${coin.symbol} favourite`}><Star size={16} fill={favourite?"currentColor":"none"}/></button></article>
});
