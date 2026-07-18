"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type FundUser={id:string;uid:string;name:string;email:string;spotBalance:number};
type FundTransaction={id:string;userUid:string;userName:string;action:"CREDIT"|"DEDUCT";amount:number;reason:string;adminUid:string;previousBalance:number;newBalance:number;createdAt:number;status:string};

const currency=(value:number)=>`$${value.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const timestamp=(value:number)=>new Date(value).toLocaleString();

export function AdminFundManagement(){
  const [uid,setUid]=useState("");
  const [user,setUser]=useState<FundUser|null>(null);
  const [action,setAction]=useState<"CREDIT"|"DEDUCT">("CREDIT");
  const [amount,setAmount]=useState("");
  const [reason,setReason]=useState("");
  const [transactions,setTransactions]=useState<FundTransaction[]>([]);
  const [message,setMessage]=useState<{kind:"success"|"error";text:string}|null>(null);
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [requestKey,setRequestKey]=useState<string|null>(null);

  const loadTransactions=useCallback(async()=>{const response=await fetch("/api/admin/funds",{cache:"no-store"});if(response.ok){const data=await response.json();setTransactions(data.transactions??[])}},[]);
  useEffect(()=>{void loadTransactions()},[loadTransactions]);

  const search=async(event?:FormEvent)=>{event?.preventDefault();setBusy(true);setMessage(null);setUser(null);try{const response=await fetch(`/api/admin/funds?uid=${encodeURIComponent(uid.trim())}`,{cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error??"Unable to find user.");setUser(data.user)}catch(error){setMessage({kind:"error",text:error instanceof Error?error.message:"Unable to find user."})}finally{setBusy(false)}};
  const refreshUser=async(userUid:string)=>{const response=await fetch(`/api/admin/funds?uid=${encodeURIComponent(userUid)}`,{cache:"no-store"});if(response.ok){const data=await response.json();setUser(data.user)}};
  const prepare=(event:FormEvent)=>{event.preventDefault();setMessage(null);if(!user)return setMessage({kind:"error",text:"Search and select a user first."});if(!(Number(amount)>0))return setMessage({kind:"error",text:"Amount must be greater than 0."});if(!reason.trim())return setMessage({kind:"error",text:"Reason is required."});setConfirming(true)};
  const submit=async()=>{if(!user)return;const key=requestKey??crypto.randomUUID();setRequestKey(key);setBusy(true);try{const response=await fetch("/api/admin/funds",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userUid:user.uid,action,amount:Number(amount),reason:reason.trim(),idempotencyKey:key})}),data=await response.json();if(!response.ok)throw new Error(data.error??"Fund action failed.");setMessage({kind:"success",text:`${action==="CREDIT"?"Credit":"Deduction"} completed. Transaction ${data.transaction.id}.`});setConfirming(false);setAmount("");setReason("");setRequestKey(null);await Promise.all([refreshUser(user.uid),loadTransactions()])}catch(error){setMessage({kind:"error",text:error instanceof Error?error.message:"Fund action failed."});setConfirming(false)}finally{setBusy(false)}};

  return <section className="admin-page">
    <header className="admin-page-head"><div><small>Wallet administration</small><h1>Admin Fund Management</h1></div></header>
    {message&&<div className={`admin-banner admin-fund-${message.kind}`} role="status">{message.text}</div>}
    <form className="admin-form" onSubmit={search}><h2>Find user</h2><input aria-label="User UID" placeholder="User UID (for example BV000001)" value={uid} onChange={event=>setUid(event.target.value.toUpperCase())}/><button disabled={busy} type="submit">{busy?"Searching...":"Search by UID"}</button></form>
    {user&&<><article className="admin-card admin-fund-user"><h2>User details</h2><div><span>Name<strong>{user.name}</strong></span><span>Email<strong>{user.email}</strong></span><span>UID<strong>{user.uid}</strong></span><span>Current Spot balance<strong>{currency(user.spotBalance)}</strong></span></div></article>
      <form className="admin-form" onSubmit={prepare}><h2>Fund action</h2><select aria-label="Action type" value={action} onChange={event=>{setAction(event.target.value as "CREDIT"|"DEDUCT");setRequestKey(null)}}><option value="CREDIT">Credit Fund</option><option value="DEDUCT">Deduct Fund</option></select><input value="Spot Wallet" aria-label="Wallet" readOnly/><input aria-label="Amount" min="0.01" step="0.01" type="number" placeholder="Amount" value={amount} onChange={event=>{setAmount(event.target.value);setRequestKey(null)}}/><input aria-label="Reason" maxLength={1000} placeholder="Reason / note (required)" value={reason} onChange={event=>{setReason(event.target.value);setRequestKey(null)}}/><button disabled={busy} type="submit">Review action</button></form></>}
    <div className="admin-table-wrap"><table><thead><tr><th>Transaction ID</th><th>User</th><th>Type</th><th>Amount</th><th>Reason</th><th>Admin</th><th>Previous</th><th>New</th><th>Date and time</th><th>Status</th></tr></thead><tbody>{transactions.map(item=><tr key={item.id}><td>{item.id}</td><td>{item.userUid}<small>{item.userName}</small></td><td>{item.action==="CREDIT"?"Credit":"Deduction"}</td><td>{currency(item.amount)}</td><td title={item.reason}>{item.reason}</td><td>{item.adminUid}</td><td>{currency(item.previousBalance)}</td><td>{currency(item.newBalance)}</td><td>{timestamp(item.createdAt)}</td><td>{item.status}</td></tr>)}{transactions.length===0&&<tr><td colSpan={10} className="admin-empty">No admin fund transactions.</td></tr>}</tbody></table></div>
    {confirming&&user&&<div className="admin-fund-modal-backdrop" role="presentation"><div aria-modal="true" className="admin-fund-modal" role="dialog"><small>Confirm fund action</small><h2>{action==="CREDIT"?"Credit":"Deduct"} {currency(Number(amount))}</h2><p>{action==="CREDIT"?"Credit to":"Deduct from"} {user.name} ({user.uid}) in the Spot Wallet?</p><p><strong>Reason:</strong> {reason}</p><div><button disabled={busy} onClick={()=>setConfirming(false)}>Cancel</button><button disabled={busy} onClick={submit}>{busy?"Processing...":"Confirm action"}</button></div></div></div>}
  </section>
}
