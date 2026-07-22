import { Prisma } from "@prisma/client";
export const TRADE_PERCENTAGE=new Prisma.Decimal("1.00000000");
const HUNDRED=new Prisma.Decimal(100);
export function calculatePrincipal(balance:Prisma.Decimal,percentage=TRADE_PERCENTAGE){if(!balance.isPositive())throw new Error("INSUFFICIENT_BALANCE");const principal=balance.mul(percentage).div(HUNDRED).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);if(!principal.isPositive()||principal.gt(balance))throw new Error("INSUFFICIENT_BALANCE");return principal}
export function calculateProfit(balanceSnapshot:Prisma.Decimal,profitRate:Prisma.Decimal){return balanceSnapshot.mul(profitRate).div(HUNDRED).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP)}
export function existingProfitRate(userUid:string,tradingDate:string,type:string){let hash=2166136261;for(const c of `${userUid}:${tradingDate}:${type==="ADDITIONAL"?"additional":"regular"}`){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}hash>>>=0;if(type==="ADDITIONAL")return new Prisma.Decimal(40+(hash%11)).div(100);return new Prisma.Decimal(100+(hash%101)).div(100).div(3).toDecimalPlaces(6,Prisma.Decimal.ROUND_HALF_UP)}
