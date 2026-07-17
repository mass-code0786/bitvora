"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCircle2, X } from "lucide-react";
export type WalletNotice={id:number;title:string;text:string};
export function WalletPortal({children}:{children:ReactNode}){const[mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);return mounted?createPortal(children,document.body):null}
export function WalletNotices({items,dismiss}:{items:WalletNotice[];dismiss:(id:number)=>void}){return <WalletPortal><div className="wallet-notices" aria-live="polite">{items.map(item=><button onClick={()=>dismiss(item.id)} key={item.id}><Bell size={15}/><div><strong>{item.title}</strong><span>{item.text}</span></div><X size={13}/></button>)}</div></WalletPortal>}
export function WalletSuccess({title,text,onDone}:{title:string;text:string;onDone:()=>void}){return <WalletPortal><div className="wallet-modal-backdrop"><div className="wallet-success-modal" role="dialog" aria-modal="true"><span><CheckCircle2 size={26}/></span><small>Wallet Updated</small><h2>{title}</h2><p>{text}</p><button onClick={onDone}>Done</button></div></div></WalletPortal>}
