import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { referralCommissionDisplay } from "@/lib/referral-display";

const source=(file:string)=>readFileSync(resolve(process.cwd(),file),"utf8"),dashboard=source("components/dashboard.tsx"),referral=source("components/referral-module.tsx");
const record=(commissionType?:string,level?:number,sourceTransferReference="wallet-transfer:transfer-internal-id")=>({commissionType:commissionType as never,level,sourceTransferReference});

describe("Referral UI and Home navigation",()=>{
  it("Home More navigates to the existing Referral page",()=>expect(dashboard).toContain('<Link href="/referral"><span><MoreHorizontal'));
  it("More no longer opens the quick-access sheet",()=>expect(dashboard).not.toContain('bitvora:open-menu'));
  it("removes the first-transfer qualification card and its content",()=>{expect(referral).not.toContain("qualification-card");expect(referral).not.toContain("First-transfer qualification");expect(referral).not.toContain("One transfer. One commission.")});
  it("displays the direct commission label",()=>expect(referralCommissionDisplay(record("DIRECT_REFERRAL_INCOME",0))).toEqual({badge:"D",label:"Direct Referral · 5%"}));
  for(let level=1;level<=5;level++)it(`displays the Level ${level} commission label`,()=>expect(referralCommissionDisplay(record(`LEVEL_${level}_INCOME`,level))).toEqual({badge:`L${level}`,label:`Level ${level} · 1%`}));
  it("never renders an internal transfer or ledger reference",()=>{expect(referral).not.toContain("sourceTransferReference}</p>");expect(referral).toContain("<p>{display.label}</p>")});
  it("keeps all historical referral levels in the unfiltered history collection",()=>{expect(referral).toContain("history=[...commissions].sort");expect(referral).toContain("history.map(record=>")});
  it("keeps income total calculations unchanged",()=>{expect(referral).toContain('direct=commissions.filter(item=>item.commissionType==="DIRECT_REFERRAL_INCOME")');expect(referral).toContain("level=commissions.filter(item=>item.level>0)");expect(referral).toContain("directTotal+levelTotal")});
  it("uses legacy metadata safely and falls back without exposing its source",()=>{expect(referralCommissionDisplay(record(undefined,undefined,"ledger:LEVEL_INCOME:level-2:secret"))).toEqual({badge:"L2",label:"Level 2 · 1%"});expect(referralCommissionDisplay(record(undefined,undefined,"database-key:unknown-secret"))).toEqual({badge:"R",label:"Referral Income"})});
  it("is display-only and performs no database or ledger mutation",()=>{const formatter=source("lib/referral-display.ts");for(const forbidden of ["prisma","fetch(","update(","create(","delete(","upsert("])expect(formatter).not.toContain(forbidden)});
});
