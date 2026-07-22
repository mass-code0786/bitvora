import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore,money } from "@/lib/wallet-data";
import { getSafeKycForUser } from "@/lib/kyc/kyc-service.server";
import { aiBotStatus } from "@/lib/ai-bot";
import { getWalletSnapshot } from "@/lib/future-wallet.server";
import type { SupportAccountContext } from "@/lib/support-rules";
type TeamRow={totalTeam:bigint;qualifiedTeam:bigint;business:Prisma.Decimal};
export async function buildSupportAccountContext(userId:string):Promise<SupportAccountContext>{
  const[user,team,kyc,financial]=await Promise.all([
    prisma.user.findUniqueOrThrow({where:{id:userId},select:{uid:true,sponsor:{select:{uid:true}},state:{select:{wallet:true}},aiBotSubscriptions:{orderBy:{activatedAt:"desc"},take:1}}}),
    prisma.$queryRaw<TeamRow[]>`WITH RECURSIVE team AS (SELECT u."id",ARRAY[u."id"] AS path FROM "User" u WHERE u."sponsorId"=${userId} UNION ALL SELECT u."id",team.path||u."id" FROM "User" u JOIN team ON u."sponsorId"=team."id" WHERE NOT u."id"=ANY(team.path)) SELECT COUNT(*)::bigint AS "totalTeam",COUNT(*) FILTER(WHERE COALESCE(w."retainedPrincipal",0)>=50)::bigint AS "qualifiedTeam",COALESCE(SUM(w."retainedPrincipal"),0) AS business FROM team LEFT JOIN "AiFinancialWallet" w ON w."userId"=team."id"`,
    getSafeKycForUser(userId).catch(()=>({status:"UNAVAILABLE" as const})),getWalletSnapshot(userId)
  ]),wallet=migrateWalletStore(user.state?.wallet),bot=aiBotStatus(user.aiBotSubscriptions[0]??null),network=team[0],pendingDeposits=wallet.transactions.filter(item=>item.status==="PENDING"&&["SPOT_DEPOSIT","NOWPAYMENTS_DEPOSIT"].includes(item.type)).length,pendingWithdrawals=wallet.transactions.filter(item=>item.status==="PENDING"&&item.type==="SPOT_WITHDRAWAL").length;
  return{uid:user.uid,spotWallet:money(wallet.wallets.spot.balance),futureWallet:money(Number(financial.availableFuture.toString())),currentRank:wallet.rankAccount.currentStar,referralIncome:money(wallet.spotIncome.referralIncome),levelIncome:money(wallet.spotIncome.levelIncome),salary:money(wallet.spotIncome.salaryIncome),reward:money(wallet.spotIncome.rewardIncome),kycStatus:kyc.status,aiBotStatus:bot.status,botExpiry:bot.expiresAt?new Date(bot.expiresAt).toISOString():null,referralLink:`/register?ref=${user.uid}`,qualifiedTeam:Number(network?.qualifiedTeam??0),totalTeam:Number(network?.totalTeam??0),business:money(Number(network?.business??0)),sponsorUid:user.sponsor?.uid??null,pendingDeposits,pendingWithdrawals}
}
