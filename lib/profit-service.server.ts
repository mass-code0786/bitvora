import "server-only";
import { prisma } from "./prisma";
import { migrateWalletStore } from "./wallet-data";
import { calculateProfit } from "./profit-calculation";

export async function getUserProfit(userId:string){const state=await prisma.userState.findUnique({where:{userId},select:{wallet:true}}),wallet=migrateWalletStore(state?.wallet);return calculateProfit(wallet.transactions)}
