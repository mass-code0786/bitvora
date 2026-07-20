"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatCurrency } from "@/lib/currency";

export function Sparkline({ data, color = "#1687ff" }: { data: number[]; color?: string }) {
  const gradientId=`spark-${useId().replaceAll(":","")}`;
  const values=useMemo(()=>{const finite=data.filter(Number.isFinite);if(!finite.length)return[];const minimum=Math.min(...finite),maximum=Math.max(...finite),range=maximum-minimum,normalized=finite.map((value,index)=>({index,value:range?(value-minimum)/range:.5}));return normalized.length===1?[normalized[0],{...normalized[0],index:1}]:normalized},[data]);
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={values} margin={{top:2,right:1,bottom:2,left:1}}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.28}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={`url(#${gradientId})`} dot={false} activeDot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer>;
}

export function EarningsChart({earnings=[]}:{earnings?:Array<{day:string;value:number}>}) {
  return <ResponsiveContainer width="100%" height={190}><BarChart data={earnings} barSize={18}><defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#58a6ff"/><stop offset="100%" stopColor="#0b5fe8"/></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#65718a", fontSize: 11 }}/><Tooltip cursor={{ fill: "rgba(39,126,255,.04)" }} contentStyle={{ background: "#071226", border: "1px solid rgba(91,157,255,.18)", borderRadius: 14, boxShadow:"0 18px 45px rgba(0,0,0,.5)" }} formatter={(value) => [formatCurrency(Number(value??0)), "Earnings"]}/><Bar dataKey="value" fill="url(#bar)" radius={[8,8,3,3]}/></BarChart></ResponsiveContainer>;
}
