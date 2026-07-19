"use client";
import { useEffect, useRef, useState } from "react";
import { WIDGET_SCRIPT } from "./tradingview-advanced-chart";

const intervals=[{label:"1m",value:"1"},{label:"5m",value:"5"},{label:"15m",value:"15"},{label:"1D",value:"D"}] as const;
const indicators=[
  {label:"Moving Average",value:"MASimple@tv-basicstudies"},
  {label:"EMA",value:"MAExp@tv-basicstudies"},
  {label:"Bollinger Bands",value:"BollingerBands@tv-basicstudies"},
  {label:"RSI",value:"RSI@tv-basicstudies"},
  {label:"MACD",value:"MACD@tv-basicstudies"},
  {label:"Volume",value:"Volume@tv-basicstudies"},
] as const;

export function TradingViewCompactChart(){
  const hostRef=useRef<HTMLDivElement>(null),loadedRef=useRef(false),[state,setState]=useState<"loading"|"ready"|"unavailable">("loading"),[interval,setIntervalValue]=useState("1"),[indicatorOpen,setIndicatorOpen]=useState(false),[studies,setStudies]=useState<string[]>([]);
  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    let disposed=false;loadedRef.current=false;setState("loading");host.replaceChildren();
    const container=document.createElement("div");container.className="tradingview-widget-container";
    const widget=document.createElement("div");widget.className="tradingview-widget-container__widget";container.appendChild(widget);
    const observer=new MutationObserver(()=>{if(container.querySelector("iframe")){clearTimeout(timeout);loadedRef.current=true;setState("ready");observer.disconnect()}});observer.observe(container,{childList:true,subtree:true});
    const script=document.createElement("script");script.src=WIDGET_SCRIPT;script.async=true;script.type="text/javascript";script.onerror=()=>!disposed&&setState("unavailable");script.text=JSON.stringify({autosize:true,symbol:"BINANCE:BTCUSDT",interval,studies,timezone:"exchange",theme:"dark",backgroundColor:"rgba(7, 7, 18, 1)",gridColor:"rgba(130, 116, 240, 0.08)",style:"1",locale:"en",withdateranges:false,hide_side_toolbar:true,hide_top_toolbar:true,hide_legend:true,hide_volume:true,allow_symbol_change:false,save_image:false,show_popup_button:false,details:false,calendar:false,hotlist:false,support_host:"https://www.tradingview.com"});
    container.appendChild(script);host.appendChild(container);const timeout=setTimeout(()=>{if(!container.querySelector("iframe")&&!disposed)setState("unavailable")},15000);
    return()=>{disposed=true;clearTimeout(timeout);observer.disconnect();host.replaceChildren()};
  },[interval,studies]);
  const toggleStudy=(study:string)=>setStudies(current=>current.includes(study)?current.filter(item=>item!==study):[...current,study]);
  return <section className="copy-btc-chart" aria-label="BTC/USDT live candlestick chart"><div className="copy-btc-chart-head"><strong>BTC/USDT</strong></div><div className="copy-btc-chart-controls" aria-label="Chart controls">{intervals.map(item=><button className={interval===item.value?"active":""} aria-pressed={interval===item.value} onClick={()=>{setIntervalValue(item.value);setIndicatorOpen(false)}} key={item.value}>{item.label}</button>)}<button className={indicatorOpen||studies.length?"active":""} aria-expanded={indicatorOpen} onClick={()=>setIndicatorOpen(value=>!value)}>Indicator{studies.length?` (${studies.length})`:""}</button>{indicatorOpen&&<div className="copy-btc-indicator-menu">{indicators.map(item=><button className={studies.includes(item.value)?"selected":""} aria-pressed={studies.includes(item.value)} onClick={()=>toggleStudy(item.value)} key={item.value}><span>{item.label}</span><i aria-hidden="true"/></button>)}</div>}</div><div className="copy-btc-chart-host" ref={hostRef}/>{!loadedRef.current&&state==="loading"&&<div className="copy-btc-chart-status">Loading live chart…</div>}{state==="unavailable"&&<div className="copy-btc-chart-status">Chart temporarily unavailable.</div>}</section>;
}
