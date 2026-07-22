import "dotenv/config";
import { createSettlementWorker } from "@/lib/ai-trade-scale/worker";
import { prisma } from "@/lib/prisma";
import { closeAiTradeQueues } from "@/lib/ai-trade-scale/queue";
const worker=createSettlementWorker();async function stop(){await worker.close();await closeAiTradeQueues();await prisma.$disconnect();process.exit(0)}process.on("SIGTERM",()=>void stop());process.on("SIGINT",()=>void stop());
