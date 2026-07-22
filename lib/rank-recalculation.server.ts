import type { Prisma } from "@prisma/client";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { ranks } from "@/lib/config";
import { evaluateRankNetwork, isCapitalQualified, type RankEvaluation, type RankNode } from "@/lib/rank-engine";
import { addMoney, migrateWalletStore, money, type WalletStore, type WalletTransaction } from "@/lib/wallet-data";

type DbNetworkUser={id:string;uid:string;sponsorUid:string|null;state:{wallet:unknown;trading:unknown}|null;financialWallet?:{retainedPrincipal:Prisma.Decimal}|null};
export type PrincipalDiagnostic={retainedFuturePrincipal:number;qualified:boolean;sourceReferences:string[];reason:string|null};

const completed=(transaction:WalletTransaction)=>transaction.status==="COMPLETED";
export function retainedFuturePrincipal(walletValue:unknown,authoritative?:Prisma.Decimal|null):PrincipalDiagnostic{
  const wallet=migrateWalletStore(walletValue),principalTransactions=wallet.transactions.filter(transaction=>completed(transaction)&&(
    transaction.type==="SPOT_TO_FUTURE_TRANSFER"&&transaction.wallet==="future"&&transaction.amount>0||
    transaction.type==="FUTURE_TO_SPOT_TRANSFER"&&transaction.wallet==="future"&&transaction.amount<0||
    transaction.type==="ADMIN_FUTURE_ADJUSTMENT"&&transaction.wallet==="future"
  ));
  const retained=authoritative?money(Math.max(0,Number(authoritative.toString()))):money(Math.max(0,principalTransactions.reduce((sum,transaction)=>sum+transaction.amount,0)));
  return{retainedFuturePrincipal:retained,qualified:isCapitalQualified(retained),sourceReferences:[...new Set(principalTransactions.map(transaction=>transaction.reference))],reason:isCapitalQualified(retained)?null:retained===0?"NO_RETAINED_FUTURE_PRINCIPAL":"RETAINED_FUTURE_PRINCIPAL_BELOW_50"};
}

export function evaluateAuthoritativeNetwork(users:readonly DbNetworkUser[]){
  const principals=new Map(users.map(user=>[user.id,retainedFuturePrincipal(user.state?.wallet,user.financialWallet?.retainedPrincipal)])),nodes:RankNode[]=users.map(user=>{const wallet=migrateWalletStore(user.state?.wallet),rewardedRanks=wallet.transactions.filter(transaction=>completed(transaction)&&transaction.type==="SPOT_REWARD_INCOME").flatMap(transaction=>{const match=transaction.id.match(/RANK_(\d+)/)??transaction.title.match(/(\d+) Star/);return match?[Number(match[1])]:[]});return{uid:user.uid,sponsorUid:user.sponsorUid??"",qualifyingFutureCapital:principals.get(user.id)!.retainedFuturePrincipal,currentStar:wallet.rankAccount.currentStar,rewardedRanks:[...new Set(rewardedRanks)]}});
  return{principals,evaluations:new Map(evaluateRankNetwork(nodes).map(evaluation=>[evaluation.uid,evaluation]))};
}

export function calculateDescendantBusiness(rootUid:string,users:readonly DbNetworkUser[]){const root=users.find(user=>user.uid===rootUid);if(!root)throw new Error("NETWORK_ROOT_NOT_FOUND");const children=new Map<string,DbNetworkUser[]>();for(const user of users){if(!user.sponsorUid)continue;children.set(user.sponsorUid,[...(children.get(user.sponsorUid)??[]),user])}const queue=[...(children.get(rootUid)??[])],visited=new Set([rootUid]),includedDescendants:Array<{uid:string;retainedFuturePrincipal:number}>=[],cycleOrDuplicateSkips:Array<{uid:string;reason:string}>=[];while(queue.length){const member=queue.shift()!;if(visited.has(member.uid)){cycleOrDuplicateSkips.push({uid:member.uid,reason:"GENEALOGY_CYCLE_OR_DUPLICATE"});continue}visited.add(member.uid);includedDescendants.push({uid:member.uid,retainedFuturePrincipal:retainedFuturePrincipal(member.state?.wallet).retainedFuturePrincipal});queue.push(...(children.get(member.uid)??[]))}return{rootUid,selfPrincipalExcluded:retainedFuturePrincipal(root.state?.wallet).retainedFuturePrincipal,descendantCount:includedDescendants.length,descendantBusiness:money(includedDescendants.reduce((sum,member)=>sum+member.retainedFuturePrincipal,0)),includedDescendants,cycleOrDuplicateSkips}}

const rewardTransaction=(user:DbNetworkUser,wallet:WalletStore,star:number,timestamp:number)=>{const rank=ranks.find(item=>item.star===star)! ,amount=rank.reward,id=`STAR_RANK_REWARD:${user.uid}:RANK_${star}`,before=wallet.wallets.spot.balance,after=addMoney(before,amount);return{transaction:{id,userId:user.id,wallet:"spot" as const,type:"SPOT_REWARD_INCOME" as const,title:`${star} Star achievement reward`,amount,balanceBefore:before,balanceAfter:after,status:"COMPLETED" as const,reference:id,timestamp},after,amount};};

export async function recalculateAuthoritativeNetwork(tx:Prisma.TransactionClient,input:{timestamp?:number;grantRewards?:boolean}={}){
  const users=await tx.user.findMany({select:{id:true,uid:true,sponsorUid:true,state:{select:{wallet:true,trading:true}},financialWallet:{select:{retainedPrincipal:true}}}}),{principals,evaluations}=evaluateAuthoritativeNetwork(users),timestamp=input.timestamp??Date.now(),grantRewards=input.grantRewards!==false,results=[];
  for(const user of users){
    const before=migrateWalletStore(user.state?.wallet),principal=principals.get(user.id)!,evaluation=evaluations.get(user.uid)!,missingRewardRanks=grantRewards?evaluation.newRewardRanks.filter(star=>!before.transactions.some(transaction=>transaction.id===`STAR_RANK_REWARD:${user.uid}:RANK_${star}`)):[],rewardTransactions:WalletTransaction[]=[];let spotBalance=before.wallets.spot.balance,rewardAmount=0;
    for(const star of missingRewardRanks){const reward=rewardTransaction(user,{...before,wallets:{...before.wallets,spot:{...before.wallets.spot,balance:spotBalance}}},star,timestamp);rewardTransactions.push(reward.transaction);spotBalance=reward.after;rewardAmount=addMoney(rewardAmount,reward.amount)}
    const rewardedRanks=[...new Set([...before.rankAccount.rewardedRanks,...evaluation.newRewardRanks])].sort((a,b)=>a-b),salaryEligible=evaluation.currentStar>0,next:WalletStore={...before,totalFuturePrincipal:principal.retainedFuturePrincipal,wallets:{...before.wallets,spot:{...before.wallets.spot,balance:spotBalance}},spotIncome:{...before.spotIncome,rewardIncome:addMoney(before.spotIncome.rewardIncome,rewardAmount)},transactions:[...rewardTransactions,...before.transactions],processedKeys:[...missingRewardRanks.map(star=>`STAR_RANK_REWARD:${user.uid}:RANK_${star}`),...before.processedKeys],rankAccount:{...before.rankAccount,qualifyingFutureCapital:principal.retainedFuturePrincipal,currentStar:evaluation.currentStar,qualifiedTeamCount:evaluation.qualifiedTeamCount,directRankCount:evaluation.directRankCount,rewardedRanks,salaryEligible}};
    if(user.state)await tx.userState.update({where:{userId:user.id},data:{wallet:next as unknown as Prisma.InputJsonValue}});else await tx.userState.create({data:{userId:user.id,wallet:next as unknown as Prisma.InputJsonValue,trading:createEmptyTradingStore() as unknown as Prisma.InputJsonValue}});
    results.push({userId:user.id,uid:user.uid,principal,rankBefore:before.rankAccount.currentStar,rankAfter:evaluation.currentStar,qualifiedTeamBefore:before.rankAccount.qualifiedTeamCount,qualifiedTeamAfter:evaluation.qualifiedTeamCount,directRankCount:evaluation.directRankCount,salaryEligible,rewardedRanks,missingRewardRanks,rewardAmount,unmetConditions:unmetConditions(evaluation)});
  }
  return results;
}

export function unmetConditions(evaluation:RankEvaluation){const next=ranks.find(rank=>rank.star>evaluation.currentStar);if(!next)return[];const conditions:string[]=[];if(evaluation.qualifiedTeamCount<next.team)conditions.push(`QUALIFIED_TEAM:${evaluation.qualifiedTeamCount}/${next.team}`);if(evaluation.directRankCount<next.directStars.count)conditions.push(`DIRECT_RANK_${next.directStars.star}:${evaluation.directRankCount}/${next.directStars.count}`);return conditions}
