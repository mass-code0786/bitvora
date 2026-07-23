import type { ReferralCommission } from "@/lib/wallet-data";

type DisplayableCommission=Partial<Pick<ReferralCommission,"commissionType"|"level"|"sourceTransferReference">>;
export type ReferralDisplay={badge:string;label:string};

const levelDisplay=(level:number):ReferralDisplay=>({badge:`L${level}`,label:`Level ${level} · 1%`});

export function referralCommissionDisplay(record:DisplayableCommission):ReferralDisplay{
  if(record.commissionType==="DIRECT_REFERRAL_INCOME")return{badge:"D",label:"Direct Referral · 5%"};
  const typedLevel=/^LEVEL_([1-5])_INCOME$/.exec(record.commissionType??"");
  if(typedLevel)return levelDisplay(Number(typedLevel[1]));
  if(Number.isInteger(record.level)&&Number(record.level)>=1&&Number(record.level)<=5)return levelDisplay(Number(record.level));
  const legacy=record.sourceTransferReference??"",legacyLevel=/(?:LEVEL[_\s-]*INCOME|LEVEL)[^1-5]*([1-5])|level-([1-5])/i.exec(legacy);
  if(legacyLevel)return levelDisplay(Number(legacyLevel[1]??legacyLevel[2]));
  if(/DIRECT[_\s-]*REFERRAL|REFERRAL[_\s-]*INCOME/i.test(legacy))return{badge:"D",label:"Direct Referral · 5%"};
  return{badge:"R",label:"Referral Income"};
}
