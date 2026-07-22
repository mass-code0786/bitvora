"use client";
import { useEffect, useState } from "react";
type CurrentUser={id:string;uid:string;name?:string|null;email?:string|null;role:string;country?:string|null};
export function useCurrentUser(){const[user,setUser]=useState<CurrentUser|null>(null);useEffect(()=>{void fetch("/api/auth/session",{cache:"no-store"}).then(r=>r.json()).then(value=>setUser(value?.user??null)).catch(()=>setUser(null))},[]);return user}
