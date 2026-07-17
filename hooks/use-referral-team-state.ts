"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bitvora-referral-team-state-v1";
export type TeamFilters = { status:string; rank:string; level:string; sort:string };
type StoredState = { expanded:string[]; favourites:string[]; filters:TeamFilters };
const initial: StoredState = { expanded:[], favourites:[], filters:{status:"All",rank:"All",level:"All",sort:"join-date"} };

export function useReferralTeamState(){
  const [state,setState]=useState<StoredState>(initial);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{try{const stored=localStorage.getItem(STORAGE_KEY);if(stored)setState({...initial,...JSON.parse(stored)})}catch{}setHydrated(true)},[]);
  const commit=useCallback((updater:(current:StoredState)=>StoredState)=>setState(current=>{const next=updater(current);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}return next}),[]);
  const toggleExpanded=useCallback((id:string)=>commit(current=>({...current,expanded:current.expanded.includes(id)?current.expanded.filter(item=>item!==id):[...current.expanded,id]})),[commit]);
  const toggleFavourite=useCallback((id:string)=>commit(current=>({...current,favourites:current.favourites.includes(id)?current.favourites.filter(item=>item!==id):[...current.favourites,id]})),[commit]);
  const setFilters=useCallback((filters:TeamFilters)=>commit(current=>({...current,filters})),[commit]);
  return {...state,hydrated,toggleExpanded,toggleFavourite,setFilters};
}
