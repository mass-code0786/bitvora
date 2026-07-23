export type TradeVisibilitySource="RELATIONAL"|"RELATIONAL_JOB"|"LEGACY_COMPATIBILITY";
export type VisibleTrade={id:string;source:TradeVisibilitySource;sourceId:string;executionKey:string;sessionId:string;pair:string;direction:"BUY"|"SELL";placementSource:"MANUAL"|"AI_BOT"|"UNKNOWN";status:"CAPITAL_LOCKED"|"SETTLED"|"FAILED"|"MISSED";profitReceived:number|null;placedAt:number;settledAt:number|null;principal:number;balanceSnapshot:number;profitRate:number};

const identity=(trade:VisibleTrade)=>`${trade.sessionId}|${trade.placedAt}|${trade.principal.toFixed(8)}|${trade.profitReceived??""}`;

export function mergeVisibleTrades(relational:readonly VisibleTrade[],legacy:readonly VisibleTrade[],migratedSourceIds:ReadonlySet<string>=new Set()){
  const executionKeys=new Set(relational.flatMap(trade=>[trade.executionKey,trade.executionKey.replace(/^LEGACY:/,"")])),identities=new Set(relational.map(identity)),sourceIds=new Set(relational.flatMap(trade=>[trade.id,trade.sourceId]));
  const combined=[...relational];
  for(const trade of legacy){
    if(migratedSourceIds.has(trade.sourceId)||sourceIds.has(trade.sourceId)||executionKeys.has(trade.executionKey)||identities.has(identity(trade)))continue;
    combined.push(trade);sourceIds.add(trade.sourceId);executionKeys.add(trade.executionKey);identities.add(identity(trade));
  }
  return combined.sort((a,b)=>b.placedAt-a.placedAt||a.id.localeCompare(b.id));
}
