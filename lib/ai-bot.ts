export const AI_BOT_PRICE=10;
export const AI_BOT_VALIDITY_DAYS=30;
export const AI_BOT_VALIDITY_MS=AI_BOT_VALIDITY_DAYS*24*60*60*1000;

export type AiBotStatus="NOT_ACTIVE"|"ACTIVE"|"EXPIRED";
export type AiBotSubscriptionView={id:string;price:number;status:AiBotStatus;activatedAt:number|null;expiresAt:number|null;remainingDays:number;displayActivatedAt?:string;displayExpiresAt?:string};

export function aiBotStatus(subscription:{id:string;price:unknown;activatedAt:Date;expiresAt:Date}|null,now=Date.now()):AiBotSubscriptionView{
  if(!subscription)return{id:"",price:AI_BOT_PRICE,status:"NOT_ACTIVE",activatedAt:null,expiresAt:null,remainingDays:0};
  const activatedAt=subscription.activatedAt.getTime(),expiresAt=subscription.expiresAt.getTime(),active=activatedAt<=now&&now<expiresAt;
  return{id:subscription.id,price:Number(subscription.price),status:active?"ACTIVE":"EXPIRED",activatedAt,expiresAt,remainingDays:active?Math.max(1,Math.ceil((expiresAt-now)/(24*60*60*1000))):0};
}
