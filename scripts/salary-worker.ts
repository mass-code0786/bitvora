import "dotenv/config";
import { createSalaryWorker } from "@/lib/salary/worker";
import { prisma } from "@/lib/prisma";
const worker=createSalaryWorker();async function stop(){await worker.close();await prisma.$disconnect();process.exit(0)}process.on("SIGTERM",()=>void stop());process.on("SIGINT",()=>void stop());
