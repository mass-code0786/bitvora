import type { WalletTransaction } from "./wallet-data";

export type RecentActivity={
  id:string;
  title:string;
  type:string;
  amount:number;
  timestamp:number;
  localDateTime?:string;
  source:"AI_WALLET_LEDGER"|"LEGACY_COMPATIBILITY";
  sourceKey:string;
};
export type AuthoritativeActivityInput={
  id:string;
  idempotencyKey:string;
  tradeId:string|null;
  operation:string;
  amount:string|number|{toString():string};
  officialAt:Date|string|number;
};

const AI_OPERATION={
  PRINCIPAL_LOCK:{title:"Trade Principal Locked",type:"AI_TRADE_PRINCIPAL_LOCKED"},
  PRINCIPAL_RETURN:{title:"Trade Principal Returned",type:"AI_TRADE_PRINCIPAL_RETURNED"},
  PROFIT_CREDIT:{title:"Trade Profit Credited",type:"AI_TRADE_PROFIT_CREDITED"}
} as const;
const LEGACY_AI_TYPE={
  AI_TRADE_CAPITAL_LOCKED:AI_OPERATION.PRINCIPAL_LOCK,
  AI_TRADE_PRINCIPAL_RETURNED:AI_OPERATION.PRINCIPAL_RETURN,
  AI_TRADE_PROFIT_CREDITED:AI_OPERATION.PROFIT_CREDIT
} as const;

const depositReference=(item:WalletTransaction)=>{
  const key=item.id.match(/NOWPAYMENTS_DEPOSIT_CREDIT:([^:]+)/i)?.[1];
  const reference=item.reference.match(/NOWPayments\s+([^ ·]+)/i)?.[1];
  return key??reference??null;
};
const aiTradeId=(item:WalletTransaction)=>item.aiTradeDetails?.tradeId??item.reference.match(/trade:([^ ·]+)/i)?.[1]??null;
const fallbackKey=(type:string,amount:number,timestamp:number)=>`fallback:${type}:${amount}:${timestamp}`;

export function mapAuthoritativeAiActivity(row:AuthoritativeActivityInput):RecentActivity|null{
  const label=AI_OPERATION[row.operation as keyof typeof AI_OPERATION];
  if(!label)return null;
  const timestamp=new Date(row.officialAt).getTime(),rawAmount=Math.abs(Number(row.amount.toString())),amount=row.operation==="PRINCIPAL_LOCK"?-rawAmount:rawAmount;
  return{id:row.id,title:label.title,type:label.type,amount,timestamp,source:"AI_WALLET_LEDGER",sourceKey:row.tradeId?`trade:${row.tradeId}:${label.type}`:`ledger:${row.id}`};
}

export function formatLegacyRecentActivity(items:WalletTransaction[]):RecentActivity[]{
  return items.map(item=>{
    if(item.type==="NOWPAYMENTS_DEPOSIT"){
      const paymentId=depositReference(item);
      return{id:item.id,title:"USDT Deposit Credited",type:"DEPOSIT_CREDITED",amount:item.amount,timestamp:item.timestamp,localDateTime:item.localDateTime,source:"LEGACY_COMPATIBILITY" as const,sourceKey:paymentId?`deposit:${paymentId}`:fallbackKey("DEPOSIT_CREDITED",item.amount,item.timestamp)};
    }
    const ai=LEGACY_AI_TYPE[item.type as keyof typeof LEGACY_AI_TYPE];
    if(ai){
      const tradeId=aiTradeId(item);
      const amount=item.type==="AI_TRADE_CAPITAL_LOCKED"?-Math.abs(item.amount):Math.abs(item.amount);
      return{id:item.id,title:ai.title,type:ai.type,amount,timestamp:item.timestamp,localDateTime:item.localDateTime,source:"LEGACY_COMPATIBILITY" as const,sourceKey:tradeId?`trade:${tradeId}:${ai.type}`:fallbackKey(ai.type,amount,item.timestamp)};
    }
    return{id:item.id,title:item.title,type:item.type,amount:item.amount,timestamp:item.timestamp,localDateTime:item.localDateTime,source:"LEGACY_COMPATIBILITY" as const,sourceKey:item.id||fallbackKey(item.type,item.amount,item.timestamp)};
  });
}

export function mergeRecentActivity(authoritative:RecentActivity[],legacy:RecentActivity[]){
  const output:RecentActivity[]=[],seen=new Set<string>();
  for(const item of [...authoritative,...legacy]){
    const keys=[item.id,item.sourceKey,fallbackKey(item.type,item.amount,item.timestamp)];
    if(keys.some(key=>seen.has(key)))continue;
    output.push(item);
    keys.forEach(key=>seen.add(key));
  }
  return output.sort((a,b)=>b.timestamp-a.timestamp);
}
