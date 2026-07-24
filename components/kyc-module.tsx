"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileCheck2, ShieldAlert } from "lucide-react";
import { PageHeader } from "./ui";
import { formatLocalDateTime } from "@/lib/date-time";
import { uploadKycForm,validateKycUploadFiles } from "@/lib/kyc/kyc-upload-client";
import type { KycDocumentType } from "@/lib/kyc/kyc-types";

type SafeKyc={status:"NOT_SUBMITTED"|"PENDING"|"APPROVED"|"REJECTED";submissionVersion:number;maskedDocumentNumber?:string;documentType?:string;reviewedAt?:number|null;reviewedLocalDateTime?:string|null;rejectionReason?:string|null;notifications:{id:string;title:string;message:string;createdAt:number;localDate:string;localDateTime:string}[]};
const copy={NOT_SUBMITTED:"Verification not submitted",PENDING:"Your documents are under review.",APPROVED:"Your KYC verification is approved.",REJECTED:"Your KYC was rejected. Correct the information and resubmit."};

export function KycModule(){
  const[kyc,setKyc]=useState<SafeKyc|null>(null),[error,setError]=useState(""),[sending,setSending]=useState(false),[documentType,setDocumentType]=useState<KycDocumentType>("PASSPORT"),submitting=useRef(false);
  const load=()=>fetch("/api/kyc/me",{cache:"no-store"}).then(r=>r.json()).then((value:SafeKyc)=>setKyc({...value,reviewedLocalDateTime:formatLocalDateTime(value.reviewedAt),notifications:value.notifications.map(item=>({...item,localDateTime:formatLocalDateTime(item.createdAt)}))}));
  useEffect(()=>{void load()},[]);
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(submitting.current)return;
    const form=new FormData(event.currentTarget),file=(name:string)=>form.get(name)instanceof File?form.get(name)as File:null;
    try{
      validateKycUploadFiles(documentType,{front:file("front"),back:file("back"),selfie:file("selfie")});
      submitting.current=true;setSending(true);setError("");
      await uploadKycForm(form);
      await load();
    }catch(uploadError){setError(uploadError instanceof Error?uploadError.message:"KYC submission failed. Please retry.")}
    finally{submitting.current=false;setSending(false)}
  };
  if(!kyc)return <p>Loading KYC status…</p>;
  const canSubmit=kyc.status==="NOT_SUBMITTED"||kyc.status==="REJECTED";
  return <div className="wallet-operation">
    <PageHeader eyebrow="Identity verification" title="KYC Verification"/>
    <section className="wallet-form-card">
      <div className="wallet-deposit-head"><span>{kyc.status==="APPROVED"?<CheckCircle2 size={20}/>:<FileCheck2 size={20}/>}</span><div><p>Current status</p><strong>{kyc.status.replaceAll("_"," ")}</strong></div></div>
      <p className="kyc-copy">{copy[kyc.status]}</p>
      {kyc.status==="REJECTED"&&<div className="wallet-warning-card"><ShieldAlert/><div><strong>Rejection reason</strong><p>{kyc.rejectionReason}</p></div></div>}
      {kyc.status==="APPROVED"&&<div className="wallet-transfer-summary"><div><span>Document</span><strong>{kyc.documentType} · {kyc.maskedDocumentNumber}</strong></div><div><span>Reviewed</span><strong>{kyc.reviewedLocalDateTime??"—"}</strong></div><div><span>Withdrawal</span><strong>Eligible</strong></div></div>}
      {kyc.status==="PENDING"&&<div className="admin-banner">Your documents are under review. Another submission cannot be created.</div>}
    </section>
    {canSubmit&&<form className="wallet-form-card kyc-form" onSubmit={submit}>
      <h2>{kyc.status==="REJECTED"?"Correct and resubmit":"Submit verification"}</h2>
      <label className="wallet-text-field"><span>Full legal name</span><input name="fullName" required/></label>
      <label className="wallet-text-field"><span>Date of birth</span><input name="dateOfBirth" type="date" required/></label>
      <label className="wallet-text-field"><span>Country</span><input name="country" required/></label>
      <label className="wallet-text-field"><span>Residential address</span><input name="residentialAddress" required/></label>
      <label className="wallet-select-field"><span>Document type</span><select name="documentType" value={documentType} onChange={event=>setDocumentType(event.target.value as KycDocumentType)} disabled={sending}><option value="PASSPORT">Passport</option><option value="NATIONAL_ID">National ID</option><option value="DRIVING_LICENSE">Driving license</option></select></label>
      <label className="wallet-text-field"><span>Document number</span><input name="documentNumber" required/></label>
      <label className="wallet-text-field"><span>Front image · JPEG, PNG, WEBP · max 8 MB</span><input name="front" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required disabled={sending}/></label>
      <label className="wallet-text-field"><span>Back image · required for National ID and Driving License</span><input name="back" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required={documentType!=="PASSPORT"} disabled={sending}/></label>
      <label className="wallet-text-field"><span>Selfie image · JPEG, PNG, WEBP · max 8 MB</span><input name="selfie" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required disabled={sending}/></label>
      {error&&<div className="admin-banner">{error}</div>}
      <button className="wallet-primary-button" disabled={sending}>{sending?"Uploading…":"Submit KYC"}</button>
    </form>}
    <section><div className="wallet-section-heading"><h2>KYC notifications</h2></div><div className="wallet-mini-history">{kyc.notifications.map(item=><div key={item.id}><span>{item.localDate}</span><div><strong>{item.title}</strong><p>{item.message}</p></div></div>)}</div></section>
    <Link className="secondary-button w-full" href="/profile">Back to profile</Link>
  </div>;
}
