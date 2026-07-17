import { notFound } from "next/navigation";
import { CoinDetail } from "@/components/coin-detail";
import { COIN_CATALOGUE, getCoin } from "@/lib/coins";

export function generateStaticParams(){return COIN_CATALOGUE.map(coin=>({symbol:coin.symbol.toLowerCase()}))}
export default async function Page({params}:{params:Promise<{symbol:string}>}){const {symbol}=await params;const coin=getCoin(symbol);if(!coin)notFound();return <CoinDetail coin={coin}/>}
