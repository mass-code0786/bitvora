"use client";
export const TRADINGVIEW_ORIGIN="https://s3.tradingview.com";
export const TRADINGVIEW_WIDGET_SCRIPT=`${TRADINGVIEW_ORIGIN}/tv.js`;
const SCRIPT_ID="bitvora-tradingview-widget-script";
type Widget={remove?:()=>void};
type WidgetConstructor=new(options:Record<string,unknown>)=>Widget;
declare global{interface Window{TradingView?:{widget:WidgetConstructor}}}
let loader:Promise<void>|null=null;
export function loadTradingView(){if(typeof window==="undefined")return Promise.reject(new Error("TradingView requires a browser."));if(window.TradingView?.widget)return Promise.resolve();if(loader)return loader;loader=new Promise<void>((resolve,reject)=>{const existing=document.getElementById(SCRIPT_ID) as HTMLScriptElement|null,script=existing??document.createElement("script"),ready=()=>window.TradingView?.widget?resolve():reject(new Error("TradingView did not initialize."));script.addEventListener("load",ready,{once:true});script.addEventListener("error",()=>{loader=null;reject(new Error("TradingView script failed to load."))},{once:true});if(!existing){script.id=SCRIPT_ID;script.src=TRADINGVIEW_WIDGET_SCRIPT;script.async=true;document.head.appendChild(script)}});return loader}
