"use client";
import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, Repeat2, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getFutureMetrics, getTransferQuote, money, transferBetweenWallets, type WalletId, type WalletStore, type WalletTransferQuote } from "@/lib/wallet-data";
import { useWalletStore } from "@/hooks/use-wallet-store";
import { PageHeader } from "./ui";
import { WalletNotices, WalletPortal, WalletSuccess, type WalletNotice } from "./wallet-ui";

type TransferResponse={wallet?:WalletStore;quote?:WalletTransferQuote;error?:string;requiresConfirmation?:boolean};
type PendingTransfer={amount:number;quote:WalletTransferQuote;remainingTargetPercentage:number};

export function WalletTransferModule(){
  const{store,update,replace}=useWalletStore(),[from,setFrom]=useState<WalletId>("spot"),[amount,setAmount]=useState(""),[pending,setPending]=useState<PendingTransfer|null>(null),[successText,setSuccessText]=useState(""),[notices,setNotices]=useState<WalletNotice[]>([]),[processing,setProcessing]=useState(false);
  const noticeId=useRef(0),requestKey=useRef(""),processingRef=useRef(false),to:WalletId=from==="spot"?"future":"spot",source=store.wallets[from],target=store.wallets[to],metrics=getFutureMetrics(store),numeric=money(Number(amount)),quote=getTransferQuote(store,from,numeric),valid=numeric>0&&numeric<=source.balance;
  const notify=(title:string,text:string)=>{const id=++noticeId.current;setNotices(current=>[...current,{id,title,text}]);setTimeout(()=>setNotices(current=>current.filter(item=>item.id!==id)),3500)};
  const closeConfirmation=()=>{if(!processingRef.current)setPending(null)};
  const changeFrom=(id:WalletId)=>{setFrom(id);setAmount("");setPending(null)};

  const complete=async()=>{
    if(processingRef.current)return;
    const transferAmount=pending?.amount??numeric;
    processingRef.current=true;
    setProcessing(true);
    try{
      if(from==="future"){
        const response=await fetch("/api/account/transfer",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({from:"future",amount:transferAmount,idempotencyKey:requestKey.current,confirmedEarlyTransfer:Boolean(pending)})}),payload=await response.json() as TransferResponse;
        if(response.status===409&&payload.requiresConfirmation&&payload.quote){setPending({amount:transferAmount,quote:payload.quote,remainingTargetPercentage:Math.max(0,100-payload.quote.progressPercentage)});return}
        if(!response.ok||!payload.wallet||!payload.quote)throw new Error(payload.error??"Transfer could not be completed.");
        replace(payload.wallet);
        const text=payload.quote.earlyTransfer?`Future Wallet transfer completed with 20% deduction. ${formatCurrency(payload.quote.netCredit)} was credited to Spot Wallet.`:"Future Wallet transfer completed with no deduction.";
        setPending(null);setSuccessText(text);notify("Transfer Complete",text);setAmount("");return;
      }
      const response=await fetch("/api/account/genealogy",{cache:"no-store"}),genealogy=await response.json() as {sourceUserId?:string;records?:Array<{id:string;sponsorId:string;uid:string;sponsorUid:string}>};
      update(current=>transferBetweenWallets(current,from,transferAmount,requestKey.current,Date.now(),{sourceUserId:genealogy.sourceUserId,genealogy:genealogy.records??[]}));
      const text=`${formatCurrency(transferAmount)} was moved to Future Wallet.`;setPending(null);setSuccessText(text);notify("Transfer Complete",text);setAmount("");
    }catch(error){notify("Transfer unavailable",error instanceof Error?error.message:"Transfer could not be completed.")}finally{processingRef.current=false;setProcessing(false)}
  };
  const submit=()=>{if(!valid){notify("Transfer unavailable",numeric>source.balance?"Insufficient wallet balance.":"Enter a valid transfer amount.");return}requestKey.current=`transfer-${crypto.randomUUID()}`;void complete()};

  return <div className="wallet-operation"><PageHeader eyebrow="Internal wallet" title="Transfer funds"/><WalletNotices items={notices} dismiss={id=>setNotices(current=>current.filter(item=>item.id!==id))}/><section className="wallet-form-card"><div className="wallet-transfer-route"><label><span>From wallet</span><div><select value={from} onChange={event=>changeFrom(event.target.value as WalletId)}><option value="spot">Spot Wallet</option><option value="future">Future Wallet</option></select><ChevronDown size={15}/></div><strong>{formatCurrency(source.balance)}</strong></label><span><ArrowRight size={17}/></span><label><span>To wallet</span><div><select value={to} disabled><option>{target.name}</option></select></div><strong>{formatCurrency(target.balance)}</strong></label></div><label className="wallet-amount-field"><span>Transfer amount</span><div><b>$</b><input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0.00"/><button onClick={()=>setAmount(String(source.balance))}>MAX</button></div><small>Available: {formatCurrency(source.balance)}</small></label>{from==="spot"?<div className="wallet-direction-note"><strong>For AI Copy Trading</strong><p>Future Wallet after transfer: {formatCurrency(target.balance+(numeric>0?numeric:0))}</p></div>:<div className={`future-transfer-lock ${metrics.futureToSpotUnlocked?"unlocked":"early"}`}><ShieldAlert size={17}/><div><strong>{metrics.futureToSpotUnlocked?"Unlocked":"Early transfer available"}</strong><p>{metrics.futureToSpotUnlocked?"No early-transfer deduction":"20% deduction applies"} · Completed {formatCurrency(metrics.totalCompletedTradingProfit)} of {formatCurrency(metrics.requiredProfitForUnlock)}</p>{!metrics.futureToSpotUnlocked&&<small>{formatCurrency(metrics.remainingProfitForUnlock)} remaining · transfer is still available with deduction.</small>}<i><span style={{width:`${metrics.unlockProgressPercentage}%`}}/></i></div></div>}<div className="wallet-transfer-summary"><div><span>{quote.earlyTransfer?"20% deduction":"Transfer fee"}</span><strong>{formatCurrency(quote.earlyTransferFee)}</strong></div><div><span>You will receive</span><strong>{formatCurrency(valid?quote.netCredit:0)}</strong></div></div><button className="wallet-primary-button" disabled={!valid||processing} onClick={submit}><Repeat2 size={17}/>{processing?"Processing…":"Review Transfer"}</button></section><section className="wallet-info-card"><ShieldCheck size={19}/><div><strong>Internal transfers only</strong><p>Future-to-Spot transfers are available before the target with a 20% deduction, and without deduction after the 70% earning target is complete.</p></div></section>
  {pending&&<WalletPortal><div className="wallet-modal-backdrop" onMouseDown={closeConfirmation}><div className="wallet-confirm-modal early-transfer-confirm" role="dialog" aria-modal="true" aria-labelledby="early-transfer-title" onMouseDown={event=>event.stopPropagation()}><button className="wallet-modal-x" aria-label="Cancel transfer" disabled={processing} onClick={closeConfirmation}><X size={16}/></button><span><ShieldAlert size={22}/></span><small id="early-transfer-title">Confirm Transfer</small><h2>{formatCurrency(pending.quote.grossAmount)}</h2><p className="early-transfer-warning">Your AI profit target is not yet complete. A 20% deduction will apply to this transfer.</p><div><p>{source.name}</p><ArrowRight size={16}/><p>{target.name}</p></div><dl><dt>Transfer amount</dt><dd>{formatCurrency(pending.quote.grossAmount)}</dd><dt>20% deduction</dt><dd>{formatCurrency(pending.quote.earlyTransferFee)}</dd><dt>Net amount received</dt><dd>{formatCurrency(pending.quote.netCredit)}</dd><dt>Remaining target percentage</dt><dd>{pending.remainingTargetPercentage.toFixed(2)}%</dd></dl><div className="wallet-modal-actions"><button disabled={processing} onClick={closeConfirmation}>Cancel</button><button disabled={processing} onClick={()=>void complete()}>{processing?"Processing…":"Confirm Transfer"}</button></div></div></div></WalletPortal>}{successText&&<WalletSuccess title="Transfer Complete" text={successText} onDone={()=>setSuccessText("")}/>}</div>;
}
