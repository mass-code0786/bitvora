import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { runDueSalaryCycle } from "@/lib/salary/orchestrator";
void runDueSalaryCycle().then(result=>console.log(JSON.stringify(result??{message:"No salary cycle is due in the 24-hour catch-up window."},null,2))).finally(()=>prisma.$disconnect());
