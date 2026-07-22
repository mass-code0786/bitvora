import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { migrateTradingStore } from "@/lib/ai-trading-engine";
import { migrateWalletStore } from "@/lib/wallet-data";

const selector=process.argv.find(value=>value.startsWith("--user="))?.slice(7);
if(!selector)throw new Error("Usage: npm run production-data-visibility:audit -- --user=<USER_ID_OR_EMAIL>");
const userSelector:string=selector;

async function main(){
  const user=await prisma.user.findFirst({where:{OR:[{id:userSelector},{email:userSelector.toLowerCase()},{uid:userSelector.toUpperCase()}]},include:{state:true,financialWallet:true}});if(!user)throw new Error("User was not found.");
  const[allUsers,opening,relationalTrades,legacyExecutions,migrations,ledgerTradeRefs]=await Promise.all([
    prisma.user.findMany({select:{id:true,uid:true,sponsorId:true,sponsorUid:true,state:{select:{wallet:true}},financialWallet:{select:{retainedPrincipal:true}}}}),
    prisma.aiWalletLedger.findUnique({where:{idempotencyKey:`FUTURE_OPENING:${user.id}`},select:{id:true}}),
    prisma.aiFinancialTrade.count({where:{userId:user.id}}),
    prisma.aiBotTradeExecution.findMany({where:{userId:user.id},select:{id:true,tradeId:true}}),
    prisma.aiLegacyTradeMigration.findMany({where:{userId:user.id},select:{sourceId:true,status:true,details:true}}),
    prisma.aiWalletLedger.count({where:{userId:user.id,tradeId:{not:null}}})
  ]);
  const legacyWallet=migrateWalletStore(user.state?.wallet),legacyTrades=migrateTradingStore(user.state?.trading).trades,directs=allUsers.filter(candidate=>candidate.sponsorId===user.id||(!candidate.sponsorId&&candidate.sponsorUid===user.uid)),children=new Map<string,string[]>();for(const candidate of allUsers){const parent=candidate.sponsorId??allUsers.find(item=>item.uid===candidate.sponsorUid)?.id;if(parent)children.set(parent,[...(children.get(parent)??[]),candidate.id])}const seen=new Set<string>(),stack=[...(children.get(user.id)??[])];while(stack.length){const id=stack.pop()!;if(seen.has(id))continue;seen.add(id);stack.push(...(children.get(id)??[]))}const migratedIds=new Set(migrations.filter(item=>item.status==="MIGRATED").map(item=>item.sourceId)),qualifiedDirects=directs.filter(item=>Number(item.financialWallet?.retainedPrincipal??migrateWalletStore(item.state?.wallet).totalFuturePrincipal)>=50),unmigratedExecutions=legacyExecutions.filter(item=>!migratedIds.has(item.id));
  console.log(JSON.stringify({mode:"READ_ONLY",user:{id:user.id,uid:user.uid,email:user.email},futureWallet:{legacyAvailable:String(legacyWallet.wallets.future.balance),legacyLocked:String(legacyWallet.lockedFutureTradeCapital),relationalAvailable:user.financialWallet?.availableFuture.toString()??null,relationalLocked:user.financialWallet?.lockedFuture.toString()??null,missingAiFinancialWallet:!user.financialWallet,missingOpeningLedger:!opening,mismatch:Boolean(user.financialWallet&&(user.financialWallet.availableFuture.toString()!==String(legacyWallet.wallets.future.balance)||user.financialWallet.lockedFuture.toString()!==String(legacyWallet.lockedFutureTradeCapital)))},trades:{legacyJson:legacyTrades.length,legacyExecutions:legacyExecutions.length,relational:relationalTrades,ledgerTradeReferences:ledgerTradeRefs,unmigratedLegacyExecutions:unmigratedExecutions.length,unmigratedExecutionIds:unmigratedExecutions.map(item=>item.id)},genealogy:{directReferralCount:directs.length,qualifiedDirectCount:qualifiedDirects.length,totalTeamCount:seen.size,directsMissingRelationalWallet:directs.filter(item=>!item.financialWallet).map(item=>item.uid),sponsorUidCompatibilityDirects:directs.filter(item=>!item.sponsorId&&item.sponsorUid===user.uid).map(item=>item.uid)},displayApis:{tradeHistory:["app/api/ai-trading/route.ts","app/api/account/state/route.ts"],futureBalance:["app/api/account/state/route.ts","app/api/account/portfolio/route.ts"],directMembers:["app/api/team/route.ts"],genealogy:["app/api/account/genealogy/route.ts"]}},null,2));
}
void main().finally(()=>prisma.$disconnect());
