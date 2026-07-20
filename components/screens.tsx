"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronRight, Crown, LogOut, ShieldCheck, Star, UsersRound, WalletCards } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWalletStore } from "@/hooks/use-wallet-store";
import { formatCurrency } from "@/lib/currency";
import { Card, PageHeader, Stat } from "./ui";

export function ProfileScreen() {
  const user=useCurrentUser();
  const {store}=useWalletStore();
  const direct=store.rankAccount.directRankCount;
  const team=store.rankAccount.qualifiedTeamCount;
  const star=store.rankAccount.currentStar;
  const [totalProfit,setTotalProfit]=useState("0.00");
  useEffect(()=>{const controller=new AbortController(),load=()=>void fetch("/api/account/profit",{cache:"no-store",signal:controller.signal}).then(async response=>response.ok?response.json():null).then(value=>{if(typeof value?.totalProfit==="string")setTotalProfit(value.totalProfit)}).catch(()=>{});load();window.addEventListener("bitvora-wallet-updated",load);return()=>{controller.abort();window.removeEventListener("bitvora-wallet-updated",load)}},[]);
  const initials=(user?.name??user?.email??"").split(/\s+|@/).filter(Boolean).slice(0,2).map(value=>value[0]?.toUpperCase()).join("")||"—";
  const rankLabel=star>0?`${star}${star===1?"st":star===2?"nd":star===3?"rd":"th"} Star`:"No rank";
  const links=[[WalletCards,"Wallet balances","View Spot and Future balances","/home#wallet-balances"],[UsersRound,"Referral plan","Invite and earn","/referral"],[Star,"Rank & salary",rankLabel,"/rank-salary"],[ShieldCheck,"KYC verification","Required only for withdrawals","/profile/kyc"]] as const;
  return <><PageHeader eyebrow="Account" title="Profile"/><Card className="profile-hero text-center"><div className="profile-avatar-wrap"><div className="avatar avatar-premium large mx-auto">{initials}</div><span><Crown size={12}/></span></div><h2 className="mt-4 text-xl font-semibold text-white">{user?.name||"No name"}</h2><p className="text-sm text-slate-500">{user?.email||"No email"}</p><p className="mt-1 text-xs text-slate-600">ID · {user?.uid||"—"}</p><span className="rank-pill mt-4"><Star size={12} fill="currentColor"/> {rankLabel}</span></Card><div className="profile-stats mt-4 grid grid-cols-3 gap-3"><Card className="p-3 text-center"><Stat label="Direct" value={String(direct)}/></Card><Card className="p-3 text-center"><Stat label="Team" value={String(team)}/></Card><Card className="p-3 text-center"><Stat label="Profit" value={formatCurrency(Number(totalProfit),{minimumFractionDigits:2,maximumFractionDigits:2})}/></Card></div><div className="mt-5 space-y-3">{links.map(([Icon,title,desc,href])=><Link href={href} className="glass-card profile-row flex items-center gap-3 p-4" key={title}><span className="icon-bubble"><Icon size={18}/></span><div className="flex-1"><p className="text-sm text-white">{title}</p><p className="text-xs text-slate-500">{desc}</p></div><ChevronRight size={17}/></Link>)}</div><button onClick={()=>void signOut({callbackUrl:"/login"})} className="secondary-button mt-6 w-full"><LogOut size={17}/> Logout</button></>;
}
