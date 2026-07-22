"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { appendAudit } from "@/lib/admin/admin-audit";
import type { KycDocumentType, KycHistoryEntry, KycStatus } from "@/lib/kyc/kyc-types";
import { formatLocalDateTime } from "@/lib/date-time";

type KycRow = { userUid:string; name:string; email:string; country:string; documentType:KycDocumentType|null; maskedDocumentNumber:string|null; status:KycStatus; submittedAt:number|null; submissionVersion:number; reviewedAt:number|null; reviewedBy:string|null };
type KycDetail = KycRow & { fullName:string; dateOfBirth:string; residentialAddress:string; documentNumber:string; hasBack:boolean; rejectionReason:string|null; history:KycHistoryEntry[] };
const fmt=(value:number|null)=>formatLocalDateTime(value);

export function AdminKycList(){
  const [rows,setRows]=useState<KycRow[]>([]),[query,setQuery]=useState(""),[status,setStatus]=useState("ALL"),[country,setCountry]=useState("ALL"),[documentType,setDocumentType]=useState("ALL");
  useEffect(()=>{void fetch("/api/admin/kyc").then(r=>r.json()).then(data=>setRows(data.records??[]))},[]);
  const countries=useMemo(()=>Array.from(new Set(rows.map(r=>r.country).filter(Boolean))).sort(),[rows]);
  const filtered=useMemo(()=>rows.filter(row=>{
    const needle=query.trim().toLowerCase();
    return (!needle||[row.userUid,row.name,row.email,row.maskedDocumentNumber??""].some(v=>v.toLowerCase().includes(needle)))&&(status==="ALL"||row.status===status)&&(country==="ALL"||row.country===country)&&(documentType==="ALL"||row.documentType===documentType);
  }),[rows,query,status,country,documentType]);
  return <section className="admin-page"><header className="admin-page-head"><div><small>Compliance</small><h1>KYC Verification</h1></div></header>
    <div className="admin-banner">Pending submissions are shown first. Document numbers are masked in this report.</div>
    <div className="admin-filters"><input aria-label="Search KYC" placeholder="Search UID, name, email or document" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="KYC status" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{["NOT_SUBMITTED","PENDING","APPROVED","REJECTED"].map(v=><option key={v}>{v}</option>)}</select><select aria-label="Country" value={country} onChange={e=>setCountry(e.target.value)}><option value="ALL">All countries</option>{countries.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Document type" value={documentType} onChange={e=>setDocumentType(e.target.value)}><option value="ALL">All documents</option>{["PASSPORT","NATIONAL_ID","DRIVING_LICENSE"].map(v=><option key={v}>{v}</option>)}</select></div>
    <div className="admin-table-wrap"><table><thead><tr><th>UID / User</th><th>Country</th><th>Document</th><th>Submitted</th><th>Version</th><th>Status</th><th>Reviewed</th><th>Reviewer</th></tr></thead><tbody>{filtered.map(row=><tr key={row.userUid}><td>{row.status==="NOT_SUBMITTED"?row.userUid:<Link href={`/admin/kyc/${row.userUid}`}>{row.userUid}</Link>}<small>{row.name} · {row.email}</small></td><td>{row.country||"—"}</td><td>{row.documentType??"—"}<small>{row.maskedDocumentNumber??""}</small></td><td>{fmt(row.submittedAt)}</td><td>{row.submissionVersion||"—"}</td><td>{row.status}</td><td>{fmt(row.reviewedAt)}</td><td>{row.reviewedBy??"—"}</td></tr>)}</tbody></table></div>
  </section>;
}

export function AdminKycDetail({uid}:{uid:string}){
  const [record,setRecord]=useState<KycDetail|null>(null),[error,setError]=useState(""),[reason,setReason]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const response=await fetch(`/api/admin/kyc/${encodeURIComponent(uid)}`);const data=await response.json();if(response.ok)setRecord(data);else setError(data.error??"Unable to load KYC.")},[uid]);
  useEffect(()=>{void load()},[load]);
  async function review(action:"APPROVE"|"REJECT"){
    setBusy(true);setError("");const before=record?.status;
    const response=await fetch(`/api/admin/kyc/${encodeURIComponent(uid)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,reason,idempotencyKey:`KYC_${action}:${uid}:${record?.submissionVersion}`})});const data=await response.json();
    if(response.ok){setRecord(data.record);if(data.changed)appendAudit({adminId:"local-demo-admin",actionType:`KYC_${action}`,targetUid:uid,targetRecord:`KYC:${uid}:${record?.submissionVersion}`,before:{status:before},after:{status:data.record.status,submissionVersion:data.record.submissionVersion},reason:action==="REJECT"?reason:"KYC review"});setReason("");}else setError(data.error??"Review failed.");setBusy(false);
  }
  if(!record)return <section className="admin-page"><h1>KYC Review</h1><p className="admin-banner">{error||"Loading…"}</p></section>;
  return <section className="admin-page"><header className="admin-page-head"><div><small>Compliance review</small><h1>{record.userUid} · {record.fullName}</h1></div><Link href="/admin/kyc">Back to KYC</Link></header>{error&&<p className="admin-banner">{error}</p>}
    <div className="admin-grid"><article className="admin-card"><h2>Submitted identity</h2><p>Name: {record.fullName}</p><p>Date of birth: {record.dateOfBirth}</p><p>Country: {record.country}</p><p>Address: {record.residentialAddress}</p><p>Document: {record.documentType} · {record.documentNumber}</p><p>Submitted: {fmt(record.submittedAt)} · Version {record.submissionVersion}</p><p>Status: {record.status}</p>{record.rejectionReason&&<p>Rejection reason: {record.rejectionReason}</p>}</article><article className="admin-card"><h2>Secure document previews</h2><div className="kyc-previews"><figure><Image src={`/api/admin/kyc/${encodeURIComponent(uid)}/document/front`} alt="Document front" width={600} height={400}/><figcaption>Front</figcaption></figure>{record.hasBack&&<figure><Image src={`/api/admin/kyc/${encodeURIComponent(uid)}/document/back`} alt="Document back" width={600} height={400}/><figcaption>Back</figcaption></figure>}<figure><Image src={`/api/admin/kyc/${encodeURIComponent(uid)}/document/selfie`} alt="Selfie" width={600} height={400}/><figcaption>Selfie</figcaption></figure></div></article></div>
    {record.status==="PENDING"&&<form className="admin-form" onSubmit={e=>e.preventDefault()}><h2>Review decision</h2><input aria-label="Rejection reason" placeholder="Mandatory reason when rejecting" value={reason} onChange={e=>setReason(e.target.value)}/><button disabled={busy} onClick={()=>void review("APPROVE")}>Approve</button><button disabled={busy||!reason.trim()} onClick={()=>void review("REJECT")}>Reject</button></form>}
    <div className="admin-table-wrap"><table><thead><tr><th>Action</th><th>Version</th><th>Actor</th><th>Before</th><th>After</th><th>Reason</th><th>Time</th></tr></thead><tbody>{record.history.map(item=><tr key={item.id}><td>{item.action}</td><td>{item.submissionVersion}</td><td>{item.actor}</td><td>{item.beforeStatus}</td><td>{item.afterStatus}</td><td>{item.reason??"—"}</td><td>{fmt(item.timestamp)}</td></tr>)}</tbody></table></div>
  </section>;
}
