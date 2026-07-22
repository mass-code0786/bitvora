import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { recoverSalaryPayments,runDueSalaryCycle } from "@/lib/salary/orchestrator";
let active=false;async function tick(){if(active)return;active=true;try{await runDueSalaryCycle();await recoverSalaryPayments()}catch(error){console.error(JSON.stringify({event:"salary_scheduler_failed",failureCode:error instanceof Error?error.name:"UNKNOWN"}))}finally{active=false}}
void tick();const timer=setInterval(()=>void tick(),60_000);async function stop(){clearInterval(timer);await prisma.$disconnect();process.exit(0)}process.on("SIGTERM",()=>void stop());process.on("SIGINT",()=>void stop());
