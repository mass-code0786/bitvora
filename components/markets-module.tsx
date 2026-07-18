"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { COIN_CATALOGUE } from "@/lib/coins";
import { useDebouncedValue, useMarketData } from "@/hooks/use-market-data";
import { MarketFilters, type MarketSort, type MarketTab } from "./market-filters";
import { MarketRow } from "./market-row";
import { EmptyState, PageHeader } from "./ui";

const PAGE_SIZE=20; const FAVOURITES_KEY="bitvora-market-favourites";
export function MarketsModule(){
  const [query,setQuery]=useState(""); const deferredQuery=useDebouncedValue(query);
  const [tab,setTab]=useState<MarketTab>("all"); const [sort,setSort]=useState<MarketSort>("marketCap"); const [page,setPage]=useState(1);
  const [favourites,setFavourites]=useState<Set<string>>(new Set()); const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{try{setFavourites(new Set(JSON.parse(localStorage.getItem(FAVOURITES_KEY)??"[]")))}catch{/* reset malformed local data */}setHydrated(true)},[]);
  const toggleFavourite=useCallback((symbol:string)=>setFavourites(current=>{const next=new Set(current);if(next.has(symbol))next.delete(symbol);else next.add(symbol);localStorage.setItem(FAVOURITES_KEY,JSON.stringify([...next]));return next}),[]);
  const [visibleSymbols,setVisibleSymbols]=useState<string[]>(COIN_CATALOGUE.slice(0,PAGE_SIZE).map(coin=>coin.symbol));
  const {markets,loading,error,refresh}=useMarketData(COIN_CATALOGUE,visibleSymbols);
  const filtered=useMemo(()=>{const needle=deferredQuery.trim().toLowerCase();return markets.filter(coin=>(!needle||coin.name.toLowerCase().includes(needle)||coin.symbol.toLowerCase().includes(needle))&&(tab!=="gainers"||coin.change>0)&&(tab!=="losers"||coin.change<0)&&(tab!=="favourites"||favourites.has(coin.symbol))).sort((a,b)=>sort==="price"?b.price-a.price:sort==="change"?b.change-a.change:sort==="volume"?b.volume-a.volume:b.marketCap-a.marketCap)},[markets,deferredQuery,tab,sort,favourites]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); const safePage=Math.min(page,pageCount);
  const visible=useMemo(()=>filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE),[filtered,safePage]);
  const visibleKey=visible.map(coin=>coin.symbol).join(","); useEffect(()=>setVisibleSymbols(visibleKey.split(",").filter(Boolean)),[visibleKey]);
  useEffect(()=>setPage(1),[deferredQuery,tab,sort]);
  return <><PageHeader title="Markets" action={<button className="icon-button" onClick={()=>void refresh()} aria-label="Refresh market data"><RefreshCw size={17} className={loading?"animate-spin":""}/></button>}/>
    {error&&<div className="market-error" role="alert"><AlertTriangle size={17}/><div><strong>Live feed unavailable</strong><p>Prices are unavailable. {error}</p></div><button onClick={()=>void refresh()}>Retry</button></div>}
    <MarketFilters query={query} onQuery={setQuery} tab={tab} onTab={setTab} sort={sort} onSort={setSort}/>
    {loading&&!markets.some(coin=>coin.isLive)?<MarketSkeleton/>:visible.length?<div className="market-list" aria-live="polite">{visible.map(coin=><MarketRow coin={coin} favourite={hydrated&&favourites.has(coin.symbol)} onFavourite={toggleFavourite} key={coin.symbol}/>)}</div>:<EmptyState title="No markets found" text={tab==="favourites"?"Star a market to keep it in your favourites.":"Try another coin name or symbol."}/>} 
    {filtered.length>PAGE_SIZE&&<nav className="market-pagination" aria-label="Market pages"><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}><ChevronLeft size={16}/> Previous</button><span>Page {safePage} of {pageCount} · {filtered.length} coins</span><button disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>Next <ChevronRight size={16}/></button></nav>}
  </>;
}
function MarketSkeleton(){return <div className="market-list">{Array.from({length:8},(_,index)=><div className="market-list-row market-row-skeleton" key={index}><i/><div><b/><span/></div><em/><strong/></div>)}</div>}
