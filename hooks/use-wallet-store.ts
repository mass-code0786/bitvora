"use client";
import { useCallback, useEffect, useState } from "react";
import { cloneWalletSeed, LEGACY_WALLET_STORE_KEY, migrateWalletStore, WALLET_STORE_KEY, type WalletStore } from "@/lib/wallet-data";

export function useWalletStore(){const [store,setStore]=useState<WalletStore>(cloneWalletSeed);const [ready,setReady]=useState(false);
  useEffect(()=>{const load=()=>{try{const saved=localStorage.getItem(WALLET_STORE_KEY),legacy=localStorage.getItem(LEGACY_WALLET_STORE_KEY),next=migrateWalletStore(JSON.parse(saved??legacy??"null"));localStorage.setItem(WALLET_STORE_KEY,JSON.stringify(next));setStore(next)}catch{const next=cloneWalletSeed();localStorage.setItem(WALLET_STORE_KEY,JSON.stringify(next));setStore(next)}};load();setReady(true);const sync=()=>load();window.addEventListener("bitvora-wallet-updated",sync);return()=>window.removeEventListener("bitvora-wallet-updated",sync)},[]);
  const update=useCallback((recipe:(current:WalletStore)=>WalletStore)=>setStore(current=>{const next=recipe(current);localStorage.setItem(WALLET_STORE_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent("bitvora-wallet-updated"));return next}),[]);
  const reset=useCallback(()=>{const next=cloneWalletSeed();localStorage.setItem(WALLET_STORE_KEY,JSON.stringify(next));setStore(next)},[]);
  return{store,ready,update,reset};
}
