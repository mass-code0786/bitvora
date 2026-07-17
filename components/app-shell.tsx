"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Bell, ChartNoAxesCombined, CircleUserRound, Gift, Headphones, History, House, MoreHorizontal, Send, Settings, Trophy, UsersRound, WalletCards, X, Zap } from "lucide-react";
import { Logo } from "./brand";
import { demoAccount } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/currency";
import { SessionGuard } from "./session-guard";

const nav=[{href:"/dashboard",label:"Home",icon:House},{href:"/markets",label:"Markets",icon:ChartNoAxesCombined},{href:"/copy-trading",label:"Trade",icon:Zap,primary:true},{href:"/team",label:"Team",icon:UsersRound},{href:"/profile",label:"Profile",icon:CircleUserRound}];
const menu=[{href:"/wallet",label:"Wallet",icon:WalletCards},{href:"/history",label:"History",icon:History},{href:"/referral",label:"Referral",icon:Gift},{href:"/rank-salary",label:"Rank & Salary",icon:Trophy},{href:"/deposit",label:"Deposit",icon:ArrowDownLeft},{href:"/withdraw",label:"Withdraw",icon:ArrowUpRight},{href:"/transfer",label:"Transfer",icon:Send},{href:"/profile",label:"Settings",icon:Settings},{href:"/profile",label:"Support",icon:Headphones}];

export function AppShell({children}:{children:ReactNode}) {
  const pathname=usePathname(); const [menuOpen,setMenuOpen]=useState(false); const dashboard=pathname==="/dashboard";
  useEffect(()=>{const open=()=>setMenuOpen(true);window.addEventListener("bitvora:open-menu",open);return()=>window.removeEventListener("bitvora:open-menu",open)},[]);
  return <div className="app-bg min-h-screen text-slate-300"><SessionGuard/><div className="noise-layer"/><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="ambient ambient-three"/>
    <header className="premium-header sticky top-0 z-40"><div className={`mx-auto max-w-6xl px-4 sm:px-6 ${dashboard?"":"flex h-16 items-center justify-between"}`}>
      {dashboard?<><div className="target-header-top"><Logo/><div className="flex items-center gap-2"><motion.button whileTap={{scale:.9}} aria-label="Notifications" className="icon-button relative"><Bell size={17}/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400 ring-2 ring-[#081020]"/></motion.button><motion.button whileTap={{scale:.9}} onClick={()=>setMenuOpen(true)} aria-label="Open menu" className="icon-button"><MoreHorizontal size={18}/></motion.button></div></div><div className="target-header-user"><div className="target-header-avatar">{demoAccount.initials}</div><div><small>Hello,</small><strong>{demoAccount.name}</strong><span>ID · {demoAccount.userId}</span></div></div></>:<><Logo/><div className="flex items-center gap-2"><Link href="/wallet" className="header-wallet hidden sm:flex"><span>Wallet</span><b>{formatCurrency(demoAccount.totalBalance)}</b></Link><motion.button whileTap={{scale:.9}} aria-label="Notifications" className="icon-button relative"><Bell size={17}/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400 ring-2 ring-[#081020]"/></motion.button></div></>}
    </div></header>
    <AnimatePresence mode="wait"><motion.main key={pathname} initial={{opacity:0,y:10,filter:"blur(4px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-6,filter:"blur(3px)"}} transition={{duration:.28,ease:[.22,.8,.2,1]}} className="relative z-10 mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-12">{children}</motion.main></AnimatePresence>
    <nav className="floating-nav fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-around px-2 py-2 lg:bottom-6">{nav.map(({href,label,icon:Icon,primary})=>{const active=pathname===href;return <motion.div key={href} whileTap={{scale:.88}}><Link href={href} className={`nav-item ${active?"active":""} ${primary?"nav-primary":""}`}>{active&&<motion.i layoutId="nav-active"/>}<Icon size={19}/><span>{label}</span></Link></motion.div>})}</nav>
    <AnimatePresence>{menuOpen&&<><motion.button aria-label="Close menu" onClick={()=>setMenuOpen(false)} className="menu-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.aside className="premium-sheet" initial={{y:"105%"}} animate={{y:0}} exit={{y:"105%"}} transition={{type:"spring",stiffness:360,damping:34}}><div className="sheet-handle"/><div className="sheet-title"><div><small>Bitvora</small><h2>Quick access</h2></div><button onClick={()=>setMenuOpen(false)} aria-label="Close"><X size={18}/></button></div><div className="sheet-grid">{menu.map(({href,label,icon:Icon},i)=><Link href={href} onClick={()=>setMenuOpen(false)} key={`${label}-${i}`}><span><Icon size={17}/></span><b>{label}</b></Link>)}</div></motion.aside></>}</AnimatePresence>
  </div>;
}
