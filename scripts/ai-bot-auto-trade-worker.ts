import "dotenv/config";
import { AI_BOT_WORKER_INTERVAL_MS, runAiBotWorkerCycle } from "@/lib/ai-bot-auto-trade.server";
import { prisma } from "@/lib/prisma";

let stopping=false,running=false;
const cycle=async()=>{if(stopping||running)return;running=true;try{const result=await runAiBotWorkerCycle();if(result.placed)console.info("[ai-bot-worker] cycle",result)}catch(error){console.error("[ai-bot-worker] cycle_failed",{error:error instanceof Error?error.message:"unknown"})}finally{running=false}};
const shutdown=async(signal:string)=>{if(stopping)return;stopping=true;console.info("[ai-bot-worker] shutdown",{signal});await prisma.$disconnect();process.exit(0)};
process.on("SIGINT",()=>void shutdown("SIGINT"));process.on("SIGTERM",()=>void shutdown("SIGTERM"));
console.info("[ai-bot-worker] online",{intervalMs:AI_BOT_WORKER_INTERVAL_MS});void cycle();setInterval(()=>void cycle(),AI_BOT_WORKER_INTERVAL_MS);
