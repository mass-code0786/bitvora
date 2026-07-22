import "server-only";
import { prisma } from "./prisma";
import { migrateWalletStore } from "./wallet-data";
import { calculateProfit } from "./profit-calculation";
import { Prisma } from "@prisma/client";

export async function getUserProfit(userId:string){const[state,profit]=await Promise.all([prisma.userState.findUnique({where:{userId},select:{wallet:true}}),prisma.aiWalletLedger.aggregate({where:{userId,operation:"PROFIT_CREDIT"},_sum:{amount:true}})]),wallet=migrateWalletStore(state?.wallet),legacy=calculateProfit(wallet.transactions),ai=profit._sum.amount??new Prisma.Decimal(0),nonAi=new Prisma.Decimal(legacy.totalProfit).sub(legacy.breakdown.aiTradeProfit);return{totalProfit:nonAi.add(ai).toFixed(2),breakdown:{...legacy.breakdown,aiTradeProfit:ai.toFixed(2)}}}
