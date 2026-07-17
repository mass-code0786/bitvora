"use client";
import { useCallback, useEffect, useState } from "react";
import { rankHistory, salaryCycles, salaryHistory, type SalaryStatus } from "@/lib/rank-salary-data";

const STORAGE_KEY="bitvora-rank-salary-state-v1";
type StoredState={activeTab:"rank"|"salary";currentStar:number;rankHistory:typeof rankHistory;salaryHistory:Array<{id:string;cycle:string;date:string;amount:number;rank:string;status:SalaryStatus}>;calendarStatuses:Record<string,SalaryStatus>;dismissedNotifications:string[]};
const seed:StoredState={activeTab:"rank",currentStar:2,rankHistory,salaryHistory:salaryHistory.map(item=>({...item})),calendarStatuses:Object.fromEntries(salaryCycles.map(cycle=>[cycle.id,cycle.status])),dismissedNotifications:[]};

export function useRankSalaryState(){
  const [state,setState]=useState<StoredState>(seed);const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{try{const stored=localStorage.getItem(STORAGE_KEY);if(stored)setState({...seed,...JSON.parse(stored)})}catch{}setHydrated(true)},[]);
  const commit=useCallback((update:(current:StoredState)=>StoredState)=>setState(current=>{const next=update(current);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}return next}),[]);
  const setActiveTab=useCallback((activeTab:"rank"|"salary")=>commit(current=>({...current,activeTab})),[commit]);
  const dismissNotification=useCallback((id:string)=>commit(current=>({...current,dismissedNotifications:[...new Set([...current.dismissedNotifications,id])]})),[commit]);
  return {...state,hydrated,setActiveTab,dismissNotification};
}
