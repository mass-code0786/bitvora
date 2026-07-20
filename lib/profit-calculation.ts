import { Prisma } from "@prisma/client";
import type { WalletTransaction, WalletTransactionType } from "./wallet-data";

export type ProfitBreakdown={aiTradeProfit:string;referralIncome:string;levelIncome:string;aiBotSponsorIncome:string;salaryIncome:string;rewardIncome:string;otherIncome:string};
export type ProfitSummary={totalProfit:string;breakdown:ProfitBreakdown};
type ProfitCategory=keyof ProfitBreakdown;
const incomeCategories:Partial<Record<WalletTransactionType,ProfitCategory>>={FUTURE_AI_TRADING_PROFIT:"aiTradeProfit",AI_TRADE_PROFIT_CREDITED:"aiTradeProfit",SPOT_REFERRAL_INCOME:"referralIncome",SPOT_LEVEL_INCOME:"levelIncome",AI_BOT_SPONSOR_INCOME:"aiBotSponsorIncome",SPOT_SALARY_INCOME:"salaryIncome",SPOT_REWARD_INCOME:"rewardIncome",SPOT_OTHER_INCOME:"otherIncome"};
const zero=()=>new Prisma.Decimal(0),decimal=(value:number)=>new Prisma.Decimal(String(value));

export function calculateProfit(transactions:readonly WalletTransaction[]):ProfitSummary{
  const totals:Record<ProfitCategory,Prisma.Decimal>={aiTradeProfit:zero(),referralIncome:zero(),levelIncome:zero(),aiBotSponsorIncome:zero(),salaryIncome:zero(),rewardIncome:zero(),otherIncome:zero()},seenLedgerIds=new Set<string>(),seenAiTrades=new Set<string>();
  for(const transaction of transactions){const category=incomeCategories[transaction.type];if(!category||transaction.status!=="COMPLETED"||!Number.isFinite(transaction.amount)||transaction.amount<=0||seenLedgerIds.has(transaction.id))continue;seenLedgerIds.add(transaction.id);if(category==="aiTradeProfit"){const tradeIdentity=transaction.aiTradeDetails?.tradeId??transaction.reference;if(seenAiTrades.has(tradeIdentity))continue;seenAiTrades.add(tradeIdentity)}totals[category]=totals[category].add(decimal(transaction.amount))}
  const total=Object.values(totals).reduce((sum,value)=>sum.add(value),zero());
  return{totalProfit:total.toFixed(2),breakdown:{aiTradeProfit:totals.aiTradeProfit.toFixed(2),referralIncome:totals.referralIncome.toFixed(2),levelIncome:totals.levelIncome.toFixed(2),aiBotSponsorIncome:totals.aiBotSponsorIncome.toFixed(2),salaryIncome:totals.salaryIncome.toFixed(2),rewardIncome:totals.rewardIncome.toFixed(2),otherIncome:totals.otherIncome.toFixed(2)}};
}
