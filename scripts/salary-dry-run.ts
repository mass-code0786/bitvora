import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { evaluateSalaryCandidates } from "@/lib/salary/eligibility";
import { salaryConfig } from "@/lib/salary/config";
import { salaryScheduledAt } from "@/lib/salary/schedule";
const date=process.argv.find(item=>item.startsWith("--date="))?.split("=")[1]??process.argv[process.argv.indexOf("--date")+1];
async function main(){if(!/^\d{4}-\d{2}-\d{2}$/.test(date??""))throw new Error("Use --date=YYYY-MM-DD");const users=await prisma.user.findMany({orderBy:{id:"asc"},select:{id:true,uid:true,sponsorUid:true,state:{select:{wallet:true,trading:true}}}}),rows=evaluateSalaryCandidates(users,salaryScheduledAt(date,salaryConfig.SALARY_TIME_ZONE)),expectedTotal=rows.reduce((sum,row)=>sum+row.amount,0);console.log(JSON.stringify({dryRun:true,date,timeZone:salaryConfig.SALARY_TIME_ZONE,usersEvaluated:rows.length,expectedTotalPayout:expectedTotal,rows:rows.map(row=>({uid:row.uid,currentRank:row.rank,salaryAmount:row.amount,status:row.eligible?"ELIGIBLE":"SKIPPED",skipReason:row.skipReason}))},null,2))}void main().finally(()=>prisma.$disconnect());
