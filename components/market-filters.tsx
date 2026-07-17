"use client";
import { Search, SlidersHorizontal } from "lucide-react";

export type MarketTab="all"|"gainers"|"losers"|"favourites";
export type MarketSort="marketCap"|"price"|"change"|"volume";
export function MarketFilters({query,onQuery,tab,onTab,sort,onSort}:{query:string;onQuery:(value:string)=>void;tab:MarketTab;onTab:(tab:MarketTab)=>void;sort:MarketSort;onSort:(sort:MarketSort)=>void}){
  return <div className="market-controls"><label className="market-search"><Search size={16}/><input value={query} onChange={event=>onQuery(event.target.value)} placeholder="Search name or symbol" aria-label="Search markets"/></label><div className="market-toolbar"><div className="market-tabs" role="tablist">{(["all","gainers","losers","favourites"] as MarketTab[]).map(value=><button role="tab" aria-selected={tab===value} className={tab===value?"active":""} onClick={()=>onTab(value)} key={value}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div><label className="market-sort"><SlidersHorizontal size={14}/><select value={sort} onChange={event=>onSort(event.target.value as MarketSort)} aria-label="Sort markets"><option value="marketCap">Market cap</option><option value="price">Price</option><option value="change">24h change</option><option value="volume">24h volume</option></select></label></div></div>
}
