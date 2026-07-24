"use client";
import React from "react";
import { useCallback,useEffect,useState } from "react";
import { isKnownWithdrawalStatus,type AdminWithdrawalResponse } from "@/lib/withdrawals/admin-response";

type LoadState="loading"|"ready"|"unauthorized"|"error";
type ActionProps={
  hashes:Record<string,string>; targets:Record<string,"BROADCASTED"|"COMPLETED">;
  reasons:Record<string,string>; setHashes:React.Dispatch<React.SetStateAction<Record<string,string>>>;
  setTargets:React.Dispatch<React.SetStateAction<Record<string,"BROADCASTED"|"COMPLETED">>>;
  setReasons:React.Dispatch<React.SetStateAction<Record<string,string>>>;
  action:(body:Record<string,string>)=>Promise<void>;
};

export function WithdrawalAdminPanel(){
  const[rows,setRows]=useState<AdminWithdrawalResponse[]>([]),[state,setState]=useState<LoadState>("loading"),[hashes,setHashes]=useState<Record<string,string>>({}),[targets,setTargets]=useState<Record<string,"BROADCASTED"|"COMPLETED">>({}),[reasons,setReasons]=useState<Record<string,string>>({}),[message,setMessage]=useState("");
  const load=useCallback(async()=>{setState("loading");try{const response=await fetch("/api/admin/withdrawals",{cache:"no-store"});if(response.status===401||response.status===403){setRows([]);setState("unauthorized");return}const value:unknown=await response.json().catch(()=>null);if(!response.ok||!value||typeof value!=="object"||!Array.isArray((value as {withdrawals?:unknown}).withdrawals)){setRows([]);setState("error");return}setRows((value as {withdrawals:AdminWithdrawalResponse[]}).withdrawals.filter(row=>row&&typeof row.id==="string"));setState("ready")}catch{setRows([]);setState("error")}},[]);
  useEffect(()=>{void load()},[load]);
  const action=async(body:Record<string,string>)=>{try{const response=await fetch("/api/admin/withdrawals",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(response.status===401||response.status===403){setState("unauthorized");setMessage("");return}const value:unknown=await response.json().catch(()=>null),error=value&&typeof value==="object"&&"error" in value?String(value.error):"Action failed.";setMessage(response.ok?"Withdrawal updated.":error);if(response.ok)await load()}catch{setMessage("Withdrawal action failed. Please retry.")}};
  return <WithdrawalAdminPanelView rows={rows} state={state} message={message} actions={{hashes,targets,reasons,setHashes,setTargets,setReasons,action}}/>;
}

export function WithdrawalAdminPanelView({rows,state,message,actions}:{rows:AdminWithdrawalResponse[];state:LoadState;message:string;actions?:ActionProps}){
  if(state==="loading")return <p className="admin-banner">Loading withdrawals…</p>;
  if(state==="unauthorized")return <p className="admin-banner">Your admin session has expired. Sign in again.</p>;
  if(state==="error")return <p className="admin-banner">Unable to load withdrawals. Please retry.</p>;
  return <><div className="admin-banner">Admin approval is available only for ADMIN_FALLBACK withdrawals. Automatic withdrawals cannot be approved here.</div>{message&&<div className="admin-banner">{message}</div>}{rows.length===0?<p className="admin-banner">No withdrawals found.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr>{["User","Wallet","Requested / Fee / Recipient","Destination","Network","Request date / Local date","Status / Mode","History","Action"].map(value=><th key={value}>{value}</th>)}</tr></thead><tbody>{rows.map(row=><WithdrawalRow key={row.id} row={row} actions={actions}/>)}</tbody></table></div>}</>;
}

function WithdrawalRow({row,actions}:{row:AdminWithdrawalResponse;actions?:ActionProps}){
  const user=row.user,name=user?.name?.trim()||"Unknown user",identity=[user?.email,user?.uid,user?.id].filter(Boolean).join(" · ")||"User details unavailable",known=isKnownWithdrawalStatus(row.status),status=known?row.status:"Unknown status",date=row.createdAt&&Number.isFinite(Date.parse(row.createdAt))?new Date(row.createdAt).toLocaleString():"Date unavailable",canAct=row.status==="PENDING_ADMIN_REVIEW"&&row.processingMode==="ADMIN_FALLBACK"&&actions;
  return <tr><td>{name}<small>{identity}</small></td><td>Spot</td><td>{row.requestedAmount||"—"}<small>Fee {row.platformFee||"—"} · Recipient {row.recipientAmount||"—"}</small></td><td><small>{row.destinationAddress||"Unavailable"}</small></td><td>{row.network||"Unknown"}</td><td>{date}<small>{row.userLocalDate||"Local date unavailable"}</small></td><td>{status}<small>{known?(row.processingMode||"Mode unavailable"):`Unrecognized value: ${row.status||"empty"}`}</small></td><td>{Number.isFinite(row.previousHistoryCount)?row.previousHistoryCount:0} previous</td><td>{canAct?<div><input aria-label="Transaction hash" placeholder="0x transaction hash" value={actions.hashes[row.id]??""} onChange={event=>actions.setHashes(v=>({...v,[row.id]:event.target.value}))}/><select aria-label="Approval status" value={actions.targets[row.id]??"BROADCASTED"} onChange={event=>actions.setTargets(v=>({...v,[row.id]:event.target.value as "BROADCASTED"|"COMPLETED"}))}><option value="BROADCASTED">Broadcasted</option><option value="COMPLETED">Completed</option></select><button onClick={()=>void actions.action({action:"APPROVE",withdrawalId:row.id,txHash:actions.hashes[row.id]??"",targetStatus:actions.targets[row.id]??"BROADCASTED"})}>Approve</button><input aria-label="Rejection reason" placeholder="Rejection reason" value={actions.reasons[row.id]??""} onChange={event=>actions.setReasons(v=>({...v,[row.id]:event.target.value}))}/><button onClick={()=>void actions.action({action:"REJECT",withdrawalId:row.id,reason:actions.reasons[row.id]??""})}>Reject</button></div>:<small>{row.txHash??row.rejectionReason??"No action available"}</small>}</td></tr>;
}
