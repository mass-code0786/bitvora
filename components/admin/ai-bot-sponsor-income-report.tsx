"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";

type Row={id:string;sponsorUid:string;buyerUid:string;purchaseAmount:number;percentage:number;commissionAmount:number;subscriptionId:string;purchaseTransactionId:string;createdAt:number;status:string};
export function AiBotSponsorIncomeReport(){
  const[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true);
  useEffect(()=>{void fetch("/api/admin/ai-bot-sponsor-income",{cache:"no-store"}).then(response=>response.ok?response.json():{records:[]}).then(data=>setRows(data.records??[])).finally(()=>setLoading(false))},[]);
  return <section className="admin-page"><div className="admin-page-head"><div><small>Direct sponsor commissions</small><h1>AI Bot Sponsor Income</h1></div></div><div className="admin-table-wrap"><table><thead><tr>{["Sponsor UID","Buyer UID","Purchase","Commission","Subscription","Purchase date","Status"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.sponsorUid}</td><td>{row.buyerUid}</td><td>{formatCurrency(row.purchaseAmount)}</td><td>{row.percentage}%<small>{formatCurrency(row.commissionAmount)}</small></td><td>{row.subscriptionId}<small>{row.purchaseTransactionId}</small></td><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.status}</td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={7}>No AI Bot sponsor income records.</td></tr>}</tbody></table></div></section>;
}
