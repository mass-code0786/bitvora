"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Inbox } from "lucide-react";

export function Card({children,className=""}:{children:ReactNode;className?:string}) { return <motion.section initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.42,ease:[.22,.8,.2,1]}} whileHover={{y:-2}} className={`glass-card ${className}`}>{children}</motion.section>; }
export function PageHeader({title,eyebrow,action}:{title?:string;eyebrow?:string;action?:ReactNode}) { return <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:.4}} className="page-heading mb-6 flex items-end justify-between gap-4"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}{title&&<h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>}</div>{action}</motion.div>; }
export function SectionTitle({title,href,label="View all"}:{title:string;href?:string;label?:string}) { return <div className="section-heading mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-white">{title}</h2>{href&&<Link href={href} className="section-link flex items-center text-xs text-blue-300">{label}<ChevronRight size={14}/></Link>}</div>; }
export function Stat({label,value,hint}:{label:string;value:string;hint?:string}) { return <div className="stat-block"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p>{hint&&<p className="mt-1 text-[11px] text-blue-300">{hint}</p>}</div>; }
export function EmptyState({title="Nothing here yet",text="New activity will appear here."}:{title?:string;text?:string}) { return <Card className="flex min-h-48 flex-col items-center justify-center text-center"><span className="icon-bubble"><Inbox size={20}/></span><h3 className="mt-4 font-medium text-white">{title}</h3><p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p></Card>; }
export function LoadingCard(){return <div className="glass-card skeleton-card"><div className="skeleton h-3 w-24 rounded"/><div className="skeleton mt-4 h-8 w-40 rounded"/><div className="skeleton mt-8 h-20 rounded-xl"/></div>}
