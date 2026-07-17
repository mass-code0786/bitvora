"use client";
import { useCallback, useEffect, useState } from "react";
import { aggregateAdminData } from "@/lib/admin/admin-data";
import type { AdminSnapshot } from "@/lib/admin/admin-types";
export function useAdminData(){const[data,setData]=useState<AdminSnapshot|null>(null),refresh=useCallback(()=>setData(aggregateAdminData()),[]);useEffect(()=>{refresh();window.addEventListener("bitvora-wallet-updated",refresh);return()=>window.removeEventListener("bitvora-wallet-updated",refresh)},[refresh]);return{data,refresh}}
