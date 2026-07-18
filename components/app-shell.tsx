"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { Bell, ChartNoAxesCombined, CircleUserRound, FileCheck2, Headphones, History, House, LogOut, Menu, Settings, UsersRound, WalletCards, X, Zap } from "lucide-react";
import { Logo } from "./brand";
import { formatCurrency } from "@/lib/currency";
import { SessionGuard } from "./session-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWalletStore } from "@/hooks/use-wallet-store";

const nav=[{href:"/home",label:"Home",icon:House},{href:"/markets",label:"Markets",icon:ChartNoAxesCombined},{href:"/trade",label:"Trade",icon:Zap,primary:true},{href:"/team",label:"Team",icon:UsersRound},{href:"/profile",label:"Profile",icon:CircleUserRound}];
const menu=[{href:"/profile",label:"Profile",icon:CircleUserRound},{href:"/profile/kyc",label:"KYC Verification",icon:FileCheck2},{href:"/wallet",label:"Wallets",icon:WalletCards},{href:"/history",label:"Transaction History",icon:History},{href:"/profile",label:"Settings",icon:Settings},{href:"/profile",label:"Support",icon:Headphones}];
type HeaderNotification={id:string;title:string;message:string;type:string;createdAt:number};

export function AppShell({children}:{children:ReactNode}) {
  const pathname=usePathname(),[menuOpen,setMenuOpen]=useState(false),[notificationsOpen,setNotificationsOpen]=useState(false),[notifications,setNotifications]=useState<HeaderNotification[]>([]),[notificationsLoading,setNotificationsLoading]=useState(false),dashboard=pathname==="/home"||pathname==="/dashboard";
  const user=useCurrentUser(),{store}=useWalletStore(),totalBalance=store.wallets.spot.balance+store.wallets.future.balance;
  const initials=(user?.name??user?.email??"").split(/\s+|@/).filter(Boolean).slice(0,2).map(value=>value[0]?.toUpperCase()).join("")||"—";
  useEffect(()=>{const open=()=>{setNotificationsOpen(false);setMenuOpen(true)};window.addEventListener("bitvora:open-menu",open);return()=>window.removeEventListener("bitvora:open-menu",open)},[]);
  useEffect(()=>{setMenuOpen(false);setNotificationsOpen(false)},[pathname]);
  const openNotifications=async()=>{setMenuOpen(false);setNotificationsOpen(true);setNotificationsLoading(true);try{const response=await fetch("/api/notifications",{cache:"no-store"}),data=await response.json();setNotifications(response.ok?data.notifications??[]:[])}finally{setNotificationsLoading(false)}};
  const openMenu=()=>{setNotificationsOpen(false);setMenuOpen(true)};
  const actions=<div className="flex items-center gap-2"><motion.button whileTap={{scale:.9}} onClick={()=>void openNotifications()} aria-label="Notifications" className="icon-button"><Bell size={17}/></motion.button><motion.button whileTap={{scale:.9}} onClick={openMenu} aria-label="Open menu" className="icon-button"><Menu size={18}/></motion.button></div>;
  return <div className="app-bg min-h-screen text-slate-300"><SessionGuard/><div className="noise-layer"/><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="ambient ambient-three"/>
    <header className="premium-header sticky top-0 z-40"><div className={`mx-auto max-w-6xl px-4 sm:px-6 ${dashboard?"":"flex h-16 items-center justify-between"}`}>
      {dashboard?<><div className="target-header-top"><Logo/>{actions}</div><div className="target-header-user"><div className="target-header-avatar">{initials}</div><div><small>Hello,</small><strong>{user?.name||"User"}</strong><span>ID · {user?.uid||"—"}</span></div></div></>:<><Logo/><div className="flex items-center gap-2"><Link href="/wallet" className="header-wallet hidden sm:flex"><span>Wallet</span><b>{formatCurrency(totalBalance)}</b></Link>{actions}</div></>}
    </div></header>
    <AnimatePresence mode="wait"><motion.main key={pathname} initial={{opacity:0,y:10,filter:"blur(4px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-6,filter:"blur(3px)"}} transition={{duration:.28,ease:[.22,.8,.2,1]}} className="inner-page-main relative z-0 min-h-screen w-full max-w-none px-4 pb-32 pt-6 md:mx-auto md:max-w-6xl md:px-6 lg:pb-12">{children}</motion.main></AnimatePresence>
    <nav aria-label="Primary navigation" className="floating-nav pointer-events-auto fixed bottom-4 left-1/2 z-[100] isolate flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-around px-2 py-2 lg:bottom-6">{nav.map(({href,label,icon:Icon,primary})=>{const active=pathname===href;return <Link href={href} prefetch={false} className={`nav-item pointer-events-auto ${active?"active":""} ${primary?"nav-primary":""}`} key={href}>{active&&<i/>}<Icon size={19}/><span>{label}</span></Link>})}</nav>
    <AnimatePresence>{menuOpen&&<><motion.button aria-label="Close menu" onClick={()=>setMenuOpen(false)} className="menu-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.22}}/><motion.aside className="premium-sheet" initial={{y:"105%"}} animate={{y:0}} exit={{y:"105%"}} transition={{duration:.26,ease:[.22,.8,.2,1]}}><div className="sheet-handle"/><div className="sheet-title"><div><small>Bitvora</small><h2>Account menu</h2></div><button onClick={()=>setMenuOpen(false)} aria-label="Close"><X size={18}/></button></div><div className="sheet-grid">{menu.map(({href,label,icon:Icon},i)=><Link href={href} onClick={()=>setMenuOpen(false)} key={`${label}-${i}`}><span><Icon size={17}/></span><b>{label}</b></Link>)}<button className="sheet-logout" onClick={()=>void signOut({callbackUrl:"/login"})}><span><LogOut size={17}/></span><b>Logout</b></button></div></motion.aside></>}</AnimatePresence>
    <AnimatePresence>{notificationsOpen&&<><motion.button aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)} className="menu-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.22}}/><motion.aside className="notification-sheet" initial={{x:"105%"}} animate={{x:0}} exit={{x:"105%"}} transition={{duration:.26,ease:[.22,.8,.2,1]}}><div className="sheet-title"><div><small>Updates</small><h2>Notifications</h2></div><button onClick={()=>setNotificationsOpen(false)} aria-label="Close"><X size={18}/></button></div><div className="notification-list">{notificationsLoading?<p className="notification-empty">Loading notifications…</p>:notifications.length?notifications.map(item=><article key={item.id}><span><Bell size={15}/></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>):<p className="notification-empty">No notifications yet.</p>}</div></motion.aside></>}</AnimatePresence>
  </div>;
}
