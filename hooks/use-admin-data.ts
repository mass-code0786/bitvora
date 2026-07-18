"use client";
import { useCallback, useEffect, useState } from "react";
import type { AdminSnapshot } from "@/lib/admin/admin-types";
export function useAdminData(){const[data,setData]=useState<AdminSnapshot|null>(null),refresh=useCallback(()=>{void fetch("/api/admin/snapshot",{cache:"no-store"}).then(response=>response.json()).then(setData)},[]);useEffect(()=>{refresh();window.addEventListener("bitvora-wallet-updated",refresh);return()=>window.removeEventListener("bitvora-wallet-updated",refresh)},[refresh]);return{data,refresh}}
