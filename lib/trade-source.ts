export type ResolvedTradeSource="AI_BOT"|"MANUAL"|"UNKNOWN";

const explicit=(value:unknown):ResolvedTradeSource|null=>value==="AI_BOT"||value==="MANUAL"?value:null;

export function resolveAuthoritativeTradeSource(value:{placementSource?:unknown;tradeType?:unknown;sessionTradeType?:unknown}):ResolvedTradeSource{
  const placement=explicit(value.placementSource);if(placement)return placement;
  const tradeType=explicit(value.tradeType),sessionType=explicit(value.sessionTradeType);
  return tradeType&&tradeType===sessionType?tradeType:"UNKNOWN";
}

export function resolveLegacyTradeSource(value:{placementSource?:unknown;hasAiBotExecution?:boolean}):ResolvedTradeSource{
  const placement=explicit(value.placementSource);if(placement)return placement;
  return value.hasAiBotExecution?"AI_BOT":"UNKNOWN";
}

export const tradeSourceLabel=(source:ResolvedTradeSource,compatibilitySource:"RELATIONAL"|"RELATIONAL_JOB"|"LEGACY_COMPATIBILITY")=>source==="AI_BOT"?"AI Bot":source==="MANUAL"?"Manual":compatibilitySource==="LEGACY_COMPATIBILITY"?"Legacy Trade":"Trade";
