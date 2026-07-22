import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { ranks,salaryPlan } from "@/lib/config";
import { checkSalaryInvariants } from "@/lib/salary/invariants";
import { evaluateSalaryCandidates } from "@/lib/salary/eligibility";
import { dueSalaryCycle,nextSalaryDate,salaryCycleKey,salaryScheduledAt } from "@/lib/salary/schedule";
import { cloneWalletSeed } from "@/lib/wallet-data";

const root=(path:string)=>readFileSync(path,"utf8"),schema=root("prisma/schema.prisma"),migration=root("prisma/migrations/20260722230000_salary_income_engine/migration.sql"),service=root("lib/salary/service.ts"),orchestrator=root("lib/salary/orchestrator.ts"),worker=root("lib/salary/worker.ts"),outbox=root("scripts/ai-outbox-worker.ts"),dryRun=root("scripts/salary-dry-run.ts"),audit=root("scripts/salary-audit.ts"),ecosystem=root("ecosystem.config.js");
const qualifiedWallet=(id:string)=>{const wallet=cloneWalletSeed();wallet.transactions=[{id:`principal-${id}`,userId:id,wallet:"future",type:"SPOT_TO_FUTURE_TRANSFER",title:"Transfer",amount:50,balanceBefore:0,balanceAfter:50,status:"COMPLETED",reference:`principal:${id}`,timestamp:1}];return wallet};
const network=(extra=7)=>{const users:Array<{id:string;uid:string;sponsorUid:string|null;state:{wallet:unknown;trading:unknown}|null}>=[{id:"root",uid:"BV100000",sponsorUid:null,state:{wallet:cloneWalletSeed(),trading:{}}}];for(let branch=1;branch<=3;branch++){const direct=`BV2${String(branch).padStart(5,"0")}`;users.push({id:`direct-${branch}`,uid:direct,sponsorUid:"BV100000",state:{wallet:qualifiedWallet(`direct-${branch}`),trading:{}}});for(let child=1;child<=5;child++)users.push({id:`b${branch}-${child}`,uid:`BV${branch+3}${String(child).padStart(5,"0")}`,sponsorUid:direct,state:{wallet:qualifiedWallet(`b${branch}-${child}`),trading:{}}})}for(let i=0;i<extra;i++)users.push({id:`extra-${i}`,uid:`BV7${String(i).padStart(5,"0")}`,sponsorUid:"BV100000",state:{wallet:qualifiedWallet(`extra-${i}`),trading:{}}});return users};

describe("salary plan and dates",()=>{
  for(const[star,amount] of [[1,10],[2,30],[3,100],[4,250],[5,500],[6,1000],[7,2000]] as const)it(`${star} Star receives $${amount}`,()=>expect(ranks.find(rank=>rank.star===star)?.salary).toBe(amount));
  it("uses the 1st and 16th",()=>expect(salaryPlan.paymentDays).toEqual([1,16]));
  it("creates deterministic cycle keys",()=>expect(salaryCycleKey("2026-08-16")).toBe("SALARY:2026-08-16"));
  it("stores Asia/Kolkata midnight in UTC",()=>expect(salaryScheduledAt("2026-08-16","Asia/Kolkata").toISOString()).toBe("2026-08-15T18:30:00.000Z"));
  it("handles the timezone boundary before local midnight",()=>expect(dueSalaryCycle(new Date("2026-08-15T18:29:59.000Z"),"Asia/Kolkata")).toBeNull());
  it("detects a due cycle at local midnight",()=>expect(dueSalaryCycle(new Date("2026-08-15T18:30:00.000Z"),"Asia/Kolkata")?.cycleKey).toBe("SALARY:2026-08-16"));
  it("allows a restart catch-up for 24 hours",()=>expect(dueSalaryCycle(new Date("2026-08-16T18:29:59.000Z"),"Asia/Kolkata")?.cycleKey).toBe("SALARY:2026-08-16"));
  it("does not catch up after 24 hours",()=>expect(dueSalaryCycle(new Date("2026-08-16T18:30:01.000Z"),"Asia/Kolkata")).toBeNull());
  it("selects the next configured date",()=>expect(nextSalaryDate(new Date("2026-08-01T00:00:00Z"),"Asia/Kolkata").date).toBe("2026-08-16"));
});

describe("salary accounting and operational contracts",()=>{
  it("rank decrease before a cycle pays the lower current-rank salary",()=>{const high=evaluateSalaryCandidates(network(7),new Date()).find(row=>row.userId==="root")!,lower=evaluateSalaryCandidates(network(6),new Date()).find(row=>row.userId==="root")!;expect(high).toMatchObject({rank:2,amount:30,eligible:true});expect(lower).toMatchObject({rank:1,amount:10,eligible:true})});
  it("a user becoming unqualified receives no salary",()=>{const users=network(0).slice(0,5),result=evaluateSalaryCandidates(users,new Date()).find(row=>row.userId==="root")!;expect(result).toMatchObject({rank:0,amount:0,eligible:false,skipReason:"NO_CURRENT_RANK"})});
  it("has no-rank skip support",()=>expect(orchestrator).toContain('skipReason:row.skipReason'));
  it("uses fresh authoritative network evaluation per cycle",()=>expect(orchestrator).toContain("evaluateSalaryCandidates(users,evaluatedAt)"));
  it("loads salary candidates with cursor pagination",()=>{expect(orchestrator).toContain("loadSalaryNetwork");expect(orchestrator).toContain("cursor:{id:cursor},skip:1")});
  it("does not reverse previous rewards",()=>expect(service).not.toContain("SPOT_REWARD_INCOME"));
  it("makes cycle and user payment unique",()=>{expect(schema).toContain("@@unique([salaryCycleId, userId])");expect(schema).toContain("cycleKey         String            @unique")});
  it("makes duplicate job delivery credit-safe",()=>{expect(service).toContain('payment.paymentStatus==="PAID"');expect(service).toContain("salaryLedger.findUnique")});
  it("locks the payment and wallet rows",()=>{expect(service).toContain('FROM "SalaryPayment"');expect(service).toContain('FROM "UserState"')});
  it("uses a serializable per-user transaction",()=>expect(service).toContain("TransactionIsolationLevel.Serializable"));
  it("worker restart recovers pending records",()=>expect(orchestrator).toContain("recoverSalaryPayments"));
  it("isolates failures and dead-letters exhausted jobs",()=>{expect(worker).toContain("getSalaryDeadLetterQueue().add");expect(worker).toContain('paymentStatus:last?"FAILED":"PENDING"')});
  it("creates one idempotent salary notification",()=>{expect(service).toContain("SALARY_NOTIFICATION:");expect(outbox).toContain('event.eventType==="SALARY_CREDITED"')});
  it("dry run does not contain wallet writes",()=>{expect(dryRun).not.toMatch(/userState\.(update|create)|salaryPayment\.create|salaryLedger\.create/);expect(dryRun).toContain("expectedTotalPayout")});
  it("reconciliation checks ledger and outbox",()=>{expect(audit).toContain("missingLedger");expect(audit).toContain("skippedWithLedger");expect(audit).toContain("outbox")});
  it("detects accounting mismatches",()=>expect(checkSalaryInvariants([{status:"PAID",amount:30,ledgerAmount:10,outboxCount:1}]).valid).toBe(false));
  it("accepts exact balanced accounting",()=>expect(checkSalaryInvariants([{status:"PAID",amount:30,ledgerAmount:30,outboxCount:1},{status:"SKIPPED",amount:0,ledgerAmount:null,outboxCount:0}]).valid).toBe(true));
  it("migration creates relational salary records",()=>{expect(migration).toContain('CREATE TABLE "SalaryCycle"');expect(migration).toContain('CREATE TABLE "SalaryPayment"');expect(migration).toContain('CREATE TABLE "SalaryLedger"')});
  it("runs scheduler and worker as unique PM2 processes",()=>{expect(ecosystem.match(/bitvora-salary-scheduler/g)).toHaveLength(1);expect(ecosystem.match(/bitvora-salary-worker/g)).toHaveLength(1)});
});
