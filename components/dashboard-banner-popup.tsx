"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
type ActiveBanner={id:string;title:string;imageUrl:string;width:number;height:number};
const key=(id:string)=>`bitvora-banner-dismissed:${id}`;
export function DashboardBannerPopup(){const[banner,setBanner]=useState<ActiveBanner|null>(null),[mounted,setMounted]=useState(false);useEffect(()=>{setMounted(true);const controller=new AbortController();fetch("/api/banners/active",{cache:"no-store",signal:controller.signal}).then(async response=>response.ok?response.json():{banner:null}).then(value=>{if(value.banner&&!sessionStorage.getItem(key(value.banner.id)))setBanner(value.banner)}).catch(()=>{});return()=>controller.abort()},[]);const close=()=>{if(banner)sessionStorage.setItem(key(banner.id),"1");setBanner(null)};if(!mounted||!banner)return null;return createPortal(<div className="dashboard-banner-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><div className="dashboard-banner-modal" role="dialog" aria-modal="true" aria-label={banner.title}><button onClick={close} aria-label="Close promotional banner"><X size={20}/></button><img src={banner.imageUrl} alt={banner.title}/></div></div>,document.body)}
