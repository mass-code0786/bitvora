"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoinDefinition } from "@/lib/coins";
import { connectVisibleMarkets, fallbackMarkets, fetchMarketBatch, fetchSparklineHistory, type MarketCoin } from "@/lib/market-service";

export function useMarketData(catalogue:CoinDefinition[],visibleSymbols:string[]){
  const [markets,setMarkets]=useState<MarketCoin[]>(()=>fallbackMarkets(catalogue));
  const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  const [fallback,setFallback]=useState(false); const [streaming,setStreaming]=useState(false); const request=useRef(0); const abortRef=useRef<AbortController|null>(null);
  const refresh=useCallback(async()=>{const current=++request.current;abortRef.current?.abort();setLoading(true);setError(null);const controller=new AbortController();abortRef.current=controller;
    try{const data=await fetchMarketBatch(catalogue,controller.signal);if(current===request.current){setMarkets(previous=>data.map(item=>({...item,sparkline:previous.find(current=>current.symbol===item.symbol)?.sparkline??[]})));setFallback(data.every(item=>!item.isLive))}}
    catch(error){if(current===request.current){setMarkets(fallbackMarkets(catalogue));setFallback(true);setError(error instanceof Error?error.message:"Live market data is unavailable")}}
    finally{if(current===request.current)setLoading(false)}
  },[catalogue]);
  useEffect(()=>{void refresh()},[refresh]);
  useEffect(()=>()=>abortRef.current?.abort(),[]);
  const visibleKey=visibleSymbols.join(",");
  useEffect(()=>{const symbols=visibleKey.split(",").filter(Boolean),controller=new AbortController();let active=true;void Promise.allSettled(symbols.map(async symbol=>({symbol,values:await fetchSparklineHistory(symbol,controller.signal)}))).then(results=>{if(!active)return;const histories=new Map(results.flatMap(result=>result.status==="fulfilled"&&result.value.values.length?[[result.value.symbol,result.value.values] as const]:[]));if(histories.size)setMarkets(previous=>previous.map(item=>{const history=histories.get(item.symbol);if(!history)return item;const latest=item.price>0?item.price:history.at(-1);return{...item,sparkline:latest===undefined?history:[...history.slice(0,-1),latest]}}))});return()=>{active=false;controller.abort()}},[visibleKey]);
  useEffect(()=>connectVisibleMarkets(visibleKey.split(",").filter(Boolean),update=>setMarkets(previous=>previous.map(item=>{if(item.symbol!==update.symbol)return item;const sparkline=item.sparkline.length?[...item.sparkline.slice(0,-1),update.price]:item.sparkline;return{...item,...update,isLive:true,sparkline}})),setStreaming),[visibleKey]);
  return {markets,loading,error,fallback,streaming,refresh};
}

export function useDebouncedValue<T>(value:T,delay=250){const [debounced,setDebounced]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),delay);return()=>clearTimeout(timer)},[value,delay]);return debounced}
