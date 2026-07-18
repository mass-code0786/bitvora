import type { CoinDefinition } from "./coins";

export type MarketCoin = CoinDefinition & { price:number;change:number;volume:number;high:number;low:number;marketCap:number;sparkline:number[];isLive:boolean };
type BinanceTicker = {symbol:string;lastPrice:string;openPrice:string;highPrice:string;lowPrice:string;quoteVolume:string};
export type LiveUpdate = {symbol:string;price:number;change:number;volume:number;high:number;low:number};

const REST_BASE="https://data-api.binance.vision";
const WS_BASE="wss://data-stream.binance.vision/stream?streams=";
const TIMEOUT_MS=8000;

export function fallbackMarkets(coins:CoinDefinition[]):MarketCoin[]{return coins.map(coin=>({
  ...coin,price:0,change:0,volume:0,marketCap:0,
  high:0,low:0,sparkline:[],isLive:false,
}))}

async function fetchWithTimeout(url:string,signal?:AbortSignal){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  const abort=()=>controller.abort(); signal?.addEventListener("abort",abort,{once:true});
  try{return await fetch(url,{signal:controller.signal,cache:"no-store"})}finally{clearTimeout(timer);signal?.removeEventListener("abort",abort)}
}

export async function fetchMarketBatch(coins:CoinDefinition[],signal?:AbortSignal):Promise<MarketCoin[]>{
  const symbols=coins.map(coin=>`${coin.symbol}USDT`);
  const query=encodeURIComponent(JSON.stringify(symbols));
  const response=await fetchWithTimeout(`${REST_BASE}/api/v3/ticker/24hr?symbols=${query}&type=MINI`,signal);
  if(!response.ok) throw new Error(`Binance market request failed (${response.status})`);
  const tickers=await response.json() as BinanceTicker[];
  const bySymbol=new Map(tickers.map(ticker=>[ticker.symbol,ticker]));
  return coins.map(coin=>{
    const ticker=bySymbol.get(`${coin.symbol}USDT`); if(!ticker)return fallbackMarkets([coin])[0];
    const price=Number(ticker.lastPrice); const open=Number(ticker.openPrice); const change=open?((price-open)/open)*100:0;
    const high=Number(ticker.highPrice),low=Number(ticker.lowPrice);
    return {...coin,price,change,volume:Number(ticker.quoteVolume),high,low,marketCap:0,sparkline:[open,low,high,price].filter(Number.isFinite),isLive:true};
  });
}

export function connectVisibleMarkets(symbols:string[],onUpdate:(update:LiveUpdate)=>void,onStatus:(connected:boolean)=>void){
  if(typeof WebSocket==="undefined"||!symbols.length)return()=>{};
  let socket:WebSocket|undefined; let retryTimer:ReturnType<typeof setTimeout>|undefined; let closed=false; let attempts=0;
  const connect=()=>{if(closed)return;const streams=symbols.map(symbol=>`${symbol.toLowerCase()}usdt@miniTicker`).join("/");socket=new WebSocket(`${WS_BASE}${streams}`);
    socket.onopen=()=>{attempts=0;onStatus(true)};
    socket.onmessage=event=>{try{const payload=JSON.parse(event.data).data;const open=Number(payload.o);const price=Number(payload.c);onUpdate({symbol:String(payload.s).replace(/USDT$/,"") ,price,change:open?((price-open)/open)*100:0,volume:Number(payload.q),high:Number(payload.h),low:Number(payload.l)})}catch{/* ignore malformed public frames */}};
    socket.onerror=()=>socket?.close();socket.onclose=()=>{onStatus(false);if(!closed){attempts+=1;retryTimer=setTimeout(connect,Math.min(1000*2**attempts,15000))}};
  };connect();return()=>{closed=true;if(retryTimer)clearTimeout(retryTimer);socket?.close()};
}
