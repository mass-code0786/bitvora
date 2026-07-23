import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDailySessions } from "@/lib/ai-trading-engine";
import { existingProfitRate } from "@/lib/ai-trade-scale/amount";
import { boundedQueueOperation } from "@/lib/ai-trade-scale/queue";
import { createBullJobId,creationJobKey,scheduleSessionsForUser,settlementBullJobId,tradeExecutionKey } from "@/lib/ai-trade-scale/orchestrator";

const source=(file:string)=>readFileSync(resolve(process.cwd(),file),"utf8");
const subscription={activatedAt:new Date("2026-08-01T00:00:00.000Z"),expiresAt:new Date("2026-09-01T00:00:00.000Z")};
const user=(timezone="Asia/Kolkata",additional=false)=>({timezone,country:null,additionalTradeEligibility:additional?{eligible:true,eligibilityStartedAt:new Date("2026-08-01T00:00:00.000Z"),eligibilityEndsAt:new Date("2026-08-11T00:00:00.000Z")}:null,aiBotSubscriptions:[subscription]});
const run=(slot:string)=>({id:`run-${slot}`,localTradingDate:"2026-08-01",localSessionSlot:slot,tradeType:"AI_BOT"});

describe("durable per-slot AI Bot scheduling",()=>{
  it("gives one user separate 12 PM, 4 PM, and 8 PM regular sessions",()=>expect(createDailySessions("2026-08-01",0,"Asia/Kolkata").filter(item=>item.type==="REGULAR").map(item=>item.sequence)).toEqual([1,2,3]));
  it("a 12 PM completion cannot block 4 PM",()=>expect(tradeExecutionKey(run("1"),"user")).not.toBe(tradeExecutionKey(run("2"),"user")));
  it("a 4 PM completion cannot block 8 PM",()=>expect(creationJobKey(run("2"),"user")).not.toBe(creationJobKey(run("3"),"user")));
  it("same-slot duplicates use one stable database and Bull job identity",()=>expect([creationJobKey(run("1"),"user"),creationJobKey(run("1"),"user"),createBullJobId(run("1"),"user"),createBullJobId(run("1"),"user")]).toEqual(["CREATE:user:2026-08-01:1:AI_BOT","CREATE:user:2026-08-01:1:AI_BOT","ai-trade-create__user__2026-08-01__1__AI_BOT","ai-trade-create__user__2026-08-01__1__AI_BOT"]));
  it("BullMQ job IDs include slot and contain no forbidden colon",()=>{for(const slot of ["1","2","3","ADDITIONAL"]){const id=createBullJobId(run(slot),"user");expect(id).toContain(`__${slot}__`);expect(id).not.toContain(":")}expect(settlementBullJobId("trade")).toBe("ai-trade-settle__trade")});
  it("execution keys include date, slot, and type",()=>expect(tradeExecutionKey(run("3"),"user")).toBe("AI_TRADE:user:2026-08-01:3:AI_BOT"));
  it("database uniqueness resolves through a slot-specific session run",()=>{const schema=source("prisma/schema.prisma");expect(schema).toContain("@@unique([localTradingDate, sessionId, tradeType])");expect(schema).toContain("@@unique([userId, sessionRunId, tradeType])")});
  it("regular sessions do not require additional eligibility",()=>{const atEightPm=new Date("2026-08-01T14:31:00.000Z"),items=scheduleSessionsForUser(user(),atEightPm);expect(items.filter(item=>item.session.type==="REGULAR"&&item.due).every(item=>item.additionalEligible)).toBe(true)});
  it("an eligible user receives one additional 10 PM candidate",()=>{const items=scheduleSessionsForUser(user("Asia/Kolkata",true),new Date("2026-08-01T17:00:00.000Z"));expect(items.filter(item=>item.session.type==="ADDITIONAL"&&item.shouldEnqueue)).toHaveLength(1)});
  it("an ineligible user receives no additional 10 PM candidate",()=>{const items=scheduleSessionsForUser(user(),new Date("2026-08-01T17:00:00.000Z"));expect(items.filter(item=>item.session.type==="ADDITIONAL"&&item.shouldEnqueue)).toHaveLength(0)});
  it("orchestrator downtime during a slot is recovered inside 12 hours",()=>{const afterFiveHours=new Date("2026-08-01T12:00:00.000Z"),noon=scheduleSessionsForUser(user(),afterFiveHours).find(item=>item.session.sequence===1)!;expect(noon).toMatchObject({due:true,insideCatchUp:true,shouldEnqueue:true})});
  it("Redis restart recovery uses persisted queued jobs and regenerated valid IDs",()=>{const orchestrator=source("lib/ai-trade-scale/orchestrator.ts");expect(orchestrator).toContain('where:{status:"QUEUED"}');expect(orchestrator).toContain("createBullJobId");expect(orchestrator).not.toContain("jobId:creationJobKey");expect(orchestrator).not.toContain("jobId:job.jobKey");expect(orchestrator).toContain("boundedQueueOperation")});
  it("does not bulk-backfill old local dates",()=>{const afterThirteenHours=new Date("2026-08-02T01:30:00.000Z"),items=scheduleSessionsForUser(user(),afterThirteenHours);expect(items.every(item=>item.session.tradingDate==="2026-08-02")).toBe(true)});
  it("manual queue operations have timeout protection",async()=>await expect(boundedQueueOperation(new Promise<never>(()=>{}),5)).rejects.toThrow("QUEUE_TIMEOUT:5"));
  it("duplicate manual requests return idempotent queue state",()=>{const intent=source("lib/ai-trade-intent.server.ts"),route=source("app/api/ai-bot/auto-join/route.ts");expect(intent).toContain("idempotent:run.idempotent");expect(route).toContain('reason:run.idempotent?"ALREADY_QUEUED":"QUEUED"')});
  it("three regular rates together preserve the approved 1%-2% daily range",()=>{const total=existingProfitRate("BV100001","2026-08-01","REGULAR").mul(3);expect(total.gte(1)&&total.lte(2)).toBe(true)});
  it("users in different timezones receive noon in their own local zone",()=>{for(const zone of ["Asia/Kolkata","America/New_York"]){const session=createDailySessions("2026-08-01",0,zone)[0],hour=new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"numeric",hourCycle:"h23"}).format(session.liveFrom);expect(hour).toBe("12")}});
  it("frontend loading state resets on timeout, error, and success paths",()=>{for(const file of ["components/copy-trading-module.tsx","components/coin-detail.tsx"]){const body=source(file);expect(body).toContain("AbortSignal.timeout(10_000)");expect(body).toMatch(/finally\{set(?:Loading|AiBusy)\(false\)\}/)}});
});
