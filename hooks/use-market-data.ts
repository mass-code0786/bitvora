"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoinDefinition } from "@/lib/coins";
import { connectVisibleMarkets, fallbackMarkets, fetchMarketBatch, type MarketCoin } from "@/lib/market-service";

export function useMarketData(catalogue:CoinDefinition[],visibleSymbols:string[]){
  const [markets,setMarkets]=useState<MarketCoin[]>(()=>fallbackMarkets(catalogue));
  const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  const [fallback,setFallback]=useState(false); const [streaming,setStreaming]=useState(false); const request=useRef(0); const abortRef=useRef<AbortController|null>(null);
  const refresh=useCallback(async()=>{const current=++request.current;abortRef.current?.abort();setLoading(true);setError(null);const controller=new AbortController();abortRef.current=controller;
    try{const data=await fetchMarketBatch(catalogue,controller.signal);if(current===request.current){setMarkets(data);setFallback(data.every(item=>!item.isLive))}}
    catch(error){if(current===request.current){setMarkets(fallbackMarkets(catalogue));setFallback(true);setError(error instanceof Error?error.message:"Live market data is unavailable")}}
    finally{if(current===request.current)setLoading(false)}
  },[catalogue]);
  useEffect(()=>{void refresh()},[refresh]);
  useEffect(()=>()=>abortRef.current?.abort(),[]);
  const visibleKey=visibleSymbols.join(",");
  useEffect(()=>connectVisibleMarkets(visibleKey.split(",").filter(Boolean),update=>setMarkets(previous=>previous.map(item=>item.symbol===update.symbol?{...item,...update,isLive:true,sparkline:[...item.sparkline.slice(1),update.price]}:item)),setStreaming),[visibleKey]);
  return {markets,loading,error,fallback,streaming,refresh};
}

export function useDebouncedValue<T>(value:T,delay=250){const [debounced,setDebounced]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),delay);return()=>clearTimeout(timer)},[value,delay]);return debounced}
