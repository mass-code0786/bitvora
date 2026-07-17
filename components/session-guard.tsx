"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function SessionGuard(){const router=useRouter();useEffect(()=>{void fetch("/api/auth/session",{cache:"no-store"}).then(r=>r.json()).then(s=>{if(!s?.user)router.replace("/login")}).catch(()=>router.replace("/login"))},[router]);return null}
export function SessionRedirect(){const router=useRouter();useEffect(()=>{void fetch("/api/auth/session",{cache:"no-store"}).then(r=>r.json()).then(s=>{if(s?.user)router.replace("/dashboard")})},[router]);return null}
