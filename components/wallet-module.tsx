"use client";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Send, WalletCards } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useWalletStore } from "@/hooks/use-wallet-store";
import { PageHeader } from "./ui";

const signed=(value:number)=>`${value>=0?"+":""}${formatCurrency(value)}`;
export function WalletModule(){const{store,ready,available}=useWalletStore(),spot=store.wallets.spot,future=store.wallets.future,spotBalance=ready&&available&&Number.isFinite(spot.balance)?spot.balance:0,futureBalance=ready&&available&&Number.isFinite(future.balance)?future.balance:0,total=spotBalance+futureBalance;return <div className="wallet-module"><PageHeader eyebrow="Portfolio" title="Wallet overview"/>
  <section className="wallet-overview"><div className="wallet-total"><span>Total Assets</span><h2>{formatCurrency(total)}</h2><p>Spot and Future Wallet</p><div className="wallet-overview-actions"><Link href="/deposit"><ArrowDownLeft size={17}/>Deposit</Link><Link href="/withdraw"><ArrowUpRight size={17}/>Withdraw</Link><Link href="/transfer"><Send size={17}/>Transfer</Link></div></div><div className="wallet-two-count"><strong>2</strong><span>primary wallets</span></div></section>
  <div className="wallet-section-heading"><h2>Primary Wallets</h2><Link href="/history">All activity <ChevronRight size={14}/></Link></div><div className={ready?"wallet-primary-grid":"wallet-primary-grid loading"}>
    <article className="wallet-account-card spot-wallet-card"><div className="wallet-account-top"><span style={{color:spot.color}}><WalletCards size={18}/></span><div><h3>Spot Wallet</h3></div></div><strong className="wallet-account-balance">{formatCurrency(spotBalance)}</strong></article>
    <article className="wallet-account-card future-wallet-card"><div className="wallet-account-top"><span style={{color:future.color}}><WalletCards size={18}/></span><div><h3>Future Wallet</h3></div></div><strong className="wallet-account-balance">{formatCurrency(futureBalance)}</strong></article>
  </div>
  <div className="wallet-section-heading"><h2>Recent Transactions</h2><Link href="/history">View all <ChevronRight size={14}/></Link></div><div className="wallet-recent-list">{store.transactions.slice(0,5).map(item=><div className="wallet-transaction-row" key={item.id}><span className="wallet-tx-icon">{item.amount>=0?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><div><strong>{item.title}</strong><p>{store.wallets[item.wallet].name} · {new Date(item.timestamp).toLocaleString()}</p></div><div><strong className={item.amount>=0?"positive":"negative"}>{signed(item.amount)}</strong><span>{item.status}</span></div></div>)}</div></div>}
