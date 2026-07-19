"use client";
import { useEffect, useRef, useState } from "react";
import { WIDGET_SCRIPT } from "./tradingview-advanced-chart";

export function TradingViewCompactChart(){
  const hostRef=useRef<HTMLDivElement>(null),loadedRef=useRef(false),[state,setState]=useState<"loading"|"ready"|"unavailable">("loading");
  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    let disposed=false;
    const container=document.createElement("div");container.className="tradingview-widget-container";
    const widget=document.createElement("div");widget.className="tradingview-widget-container__widget";container.appendChild(widget);
    const observer=new MutationObserver(()=>{if(container.querySelector("iframe")){clearTimeout(timeout);loadedRef.current=true;setState("ready");observer.disconnect()}});observer.observe(container,{childList:true,subtree:true});
    const script=document.createElement("script");script.src=WIDGET_SCRIPT;script.async=true;script.type="text/javascript";script.onerror=()=>!disposed&&setState("unavailable");script.text=JSON.stringify({autosize:true,symbol:"BINANCE:BTCUSDT",interval:"1",timezone:"exchange",theme:"dark",backgroundColor:"rgba(7, 7, 18, 1)",gridColor:"rgba(130, 116, 240, 0.08)",style:"1",locale:"en",withdateranges:false,hide_side_toolbar:true,hide_top_toolbar:true,hide_legend:true,hide_volume:false,allow_symbol_change:false,save_image:false,show_popup_button:false,details:false,calendar:false,hotlist:false,support_host:"https://www.tradingview.com"});
    container.appendChild(script);host.appendChild(container);const timeout=setTimeout(()=>{if(!container.querySelector("iframe")&&!disposed)setState("unavailable")},15000);
    return()=>{disposed=true;clearTimeout(timeout);observer.disconnect();host.replaceChildren()};
  },[]);
  return <section className="copy-btc-chart" aria-label="BTC/USDT live candlestick chart"><div className="copy-btc-chart-head"><div><span>Live market</span><strong>BTC/USDT</strong></div><small>1m</small></div><div className="copy-btc-chart-host" ref={hostRef}/>{!loadedRef.current&&state==="loading"&&<div className="copy-btc-chart-status">Loading live chart…</div>}{state==="unavailable"&&<div className="copy-btc-chart-status">Chart temporarily unavailable.</div>}</section>;
}
