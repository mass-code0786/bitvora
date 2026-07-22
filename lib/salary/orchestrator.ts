import "server-only";
import { Prisma,type SalaryCycle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateSalaryCandidates } from "./eligibility";
import { salaryConfig } from "./config";
import { getSalaryQueue,salaryJobOptions } from "./queue";
import { dueSalaryCycle,salaryCycleKey,salaryScheduledAt } from "./schedule";

async function loadSalaryNetwork(){const users:Array<{id:string;uid:string;sponsorUid:string|null;state:{wallet:Prisma.JsonValue;trading:Prisma.JsonValue}|null}>=[];let cursor:string|undefined;for(;;){const page=await prisma.user.findMany({orderBy:{id:"asc"},take:salaryConfig.SALARY_ENQUEUE_BATCH_SIZE,...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,uid:true,sponsorUid:true,state:{select:{wallet:true,trading:true}}}});if(!page.length)break;users.push(...page);cursor=page.at(-1)!.id;if(page.length<salaryConfig.SALARY_ENQUEUE_BATCH_SIZE)break}return users}

export async function createSalaryCycleForDate(date:string,options:{enqueue?:boolean;now?:Date}={}){const scheduledAt=salaryScheduledAt(date,salaryConfig.SALARY_TIME_ZONE),cycleKey=salaryCycleKey(date);let cycle:SalaryCycle;
  try{cycle=await prisma.salaryCycle.create({data:{cycleKey,scheduledAt,officialTimeZone:salaryConfig.SALARY_TIME_ZONE,status:"PENDING",startedAt:options.now??new Date()}})}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return prisma.salaryCycle.findUniqueOrThrow({where:{cycleKey}});throw error}
  const users=await loadSalaryNetwork(),evaluatedAt=options.now??new Date(),evaluations=evaluateSalaryCandidates(users,evaluatedAt),batch=salaryConfig.SALARY_ENQUEUE_BATCH_SIZE;
  for(let start=0;start<evaluations.length;start+=batch){const rows=evaluations.slice(start,start+batch);await prisma.salaryPayment.createMany({data:rows.map(row=>({salaryCycleId:cycle.id,userId:row.userId,evaluatedRank:row.rank,salaryAmount:new Prisma.Decimal(row.amount),eligibilityStatus:row.eligible?"ELIGIBLE":"NO_RANK",eligibilitySnapshotJson:row.snapshot as unknown as Prisma.InputJsonValue,paymentStatus:row.eligible?"PENDING":"SKIPPED",skipReason:row.skipReason,ledgerKey:`SALARY:${cycleKey}:${row.userId}`})),skipDuplicates:true})}
  const eligible=evaluations.filter(row=>row.eligible);cycle=await prisma.salaryCycle.update({where:{id:cycle.id},data:{status:eligible.length?"RUNNING":"COMPLETED",totalCandidates:evaluations.length,totalEligible:eligible.length,totalSkipped:evaluations.length-eligible.length,...(!eligible.length?{completedAt:new Date()}: {})}});
  if(options.enqueue!==false){const queue=getSalaryQueue();for(let start=0;start<eligible.length;start+=batch){for(const row of eligible.slice(start,start+batch)){const payment=await prisma.salaryPayment.findUniqueOrThrow({where:{salaryCycleId_userId:{salaryCycleId:cycle.id,userId:row.userId}},select:{id:true}});await queue.add("pay-salary",{paymentId:payment.id,cycleId:cycle.id},{...salaryJobOptions,jobId:`SALARY_JOB:${cycle.id}:${row.userId}`})}}}
  return cycle
}
export async function runDueSalaryCycle(now=new Date()){const due=dueSalaryCycle(now,salaryConfig.SALARY_TIME_ZONE);return due?createSalaryCycleForDate(due.date,{now}):null}
export async function recoverSalaryPayments(){const payments=await prisma.salaryPayment.findMany({where:{paymentStatus:{in:["PENDING","FAILED"]},attempts:{lt:salaryConfig.SALARY_MAX_RETRIES}},take:salaryConfig.SALARY_ENQUEUE_BATCH_SIZE,orderBy:{id:"asc"},select:{id:true,salaryCycleId:true,userId:true,attempts:true}});if(!payments.length)return;const queue=getSalaryQueue();for(const payment of payments)await queue.add("pay-salary",{paymentId:payment.id,cycleId:payment.salaryCycleId},{...salaryJobOptions,jobId:`SALARY_RECOVER:${payment.id}:${payment.attempts}`})}
