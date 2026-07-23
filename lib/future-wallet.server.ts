import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { migrateWalletStore } from "@/lib/wallet-data";

export type FutureWalletTx=Prisma.TransactionClient;
export type FutureWalletSnapshot={availableFuture:Prisma.Decimal;lockedFuture:Prisma.Decimal;completedProfit:Prisma.Decimal;retainedPrincipal:Prisma.Decimal;version:number};
export type FutureWalletReadSnapshot=FutureWalletSnapshot&{source:"RELATIONAL"|"LEGACY_COMPATIBILITY";authoritativeReady:boolean;missingWallet:boolean;missingOpeningLedger:boolean};
const ZERO=new Prisma.Decimal(0);

async function seedValue(tx:FutureWalletTx,userId:string){const state=await tx.userState.findUnique({where:{userId},select:{wallet:true}}),legacy=migrateWalletStore(state?.wallet);return{available:new Prisma.Decimal(String(legacy.wallets.future.balance)),locked:new Prisma.Decimal(String(legacy.lockedFutureTradeCapital)),profit:new Prisma.Decimal(String(legacy.totalCompletedTradingProfit))}}

export async function ensureFutureWallet(tx:FutureWalletTx,userId:string){
  const seed=await seedValue(tx,userId);
  const state=await tx.userState.findUnique({where:{userId},select:{wallet:true}}),retained=new Prisma.Decimal(String(migrateWalletStore(state?.wallet).totalFuturePrincipal));await tx.aiFinancialWallet.upsert({where:{userId},create:{userId,availableFuture:seed.available,lockedFuture:seed.locked,completedProfit:seed.profit,openingBalance:seed.available.add(seed.locked),retainedPrincipal:retained},update:{}});
  await tx.aiWalletLedger.createMany({data:[{idempotencyKey:`FUTURE_OPENING:${userId}`,userId,operation:"OPENING_BALANCE",amount:seed.available.add(seed.locked),availableBefore:ZERO,availableAfter:seed.available,lockedBefore:ZERO,lockedAfter:seed.locked,officialAt:new Date()}],skipDuplicates:true});
}

export async function lockFutureWallet(tx:FutureWalletTx,userId:string){await ensureFutureWallet(tx,userId);await tx.$queryRaw`SELECT "userId" FROM "AiFinancialWallet" WHERE "userId"=${userId} FOR UPDATE`;return tx.aiFinancialWallet.findUniqueOrThrow({where:{userId}})}
export async function lockAuthoritativeFutureWallet(tx:FutureWalletTx,userId:string){
  const opening=await tx.aiWalletLedger.findUnique({where:{idempotencyKey:`FUTURE_OPENING:${userId}`},select:{id:true}});
  if(!opening)throw new Error("AUTHORITATIVE_OPENING_LEDGER_MISSING");
  const rows=await tx.$queryRaw<Array<{userId:string}>>`SELECT "userId" FROM "AiFinancialWallet" WHERE "userId"=${userId} FOR UPDATE`;
  if(!rows.length)throw new Error("AUTHORITATIVE_FUTURE_WALLET_MISSING");
  return tx.aiFinancialWallet.findUniqueOrThrow({where:{userId}});
}
export async function getFutureBalance(userId:string){return prisma.$transaction(async tx=>(await lockFutureWallet(tx,userId)).availableFuture,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})}
export async function getWalletSnapshot(userId:string):Promise<FutureWalletSnapshot>{return prisma.$transaction(async tx=>{const value=await lockFutureWallet(tx,userId);return{availableFuture:value.availableFuture,lockedFuture:value.lockedFuture,completedProfit:value.completedProfit,retainedPrincipal:value.retainedPrincipal,version:value.version}},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})}
export async function getWalletReadSnapshot(userId:string):Promise<FutureWalletReadSnapshot>{const[financial,opening,state]=await Promise.all([prisma.aiFinancialWallet.findUnique({where:{userId}}),prisma.aiWalletLedger.findUnique({where:{idempotencyKey:`FUTURE_OPENING:${userId}`},select:{id:true}}),prisma.userState.findUnique({where:{userId},select:{wallet:true}})]),legacy=migrateWalletStore(state?.wallet);if(financial&&opening)return{availableFuture:financial.availableFuture,lockedFuture:financial.lockedFuture,completedProfit:financial.completedProfit,retainedPrincipal:financial.retainedPrincipal,version:financial.version,source:"RELATIONAL",authoritativeReady:true,missingWallet:false,missingOpeningLedger:false};return{availableFuture:new Prisma.Decimal(String(legacy.wallets.future.balance)),lockedFuture:new Prisma.Decimal(String(legacy.lockedFutureTradeCapital)),completedProfit:new Prisma.Decimal(String(legacy.totalCompletedTradingProfit)),retainedPrincipal:new Prisma.Decimal(String(legacy.totalFuturePrincipal)),version:financial?.version??0,source:"LEGACY_COMPATIBILITY",authoritativeReady:false,missingWallet:!financial,missingOpeningLedger:!opening}}

type Mutation={userId:string;amount:Prisma.Decimal;idempotencyKey:string;operation:string;officialAt:Date;tradeId?:string;availableDelta:Prisma.Decimal;lockedDelta?:Prisma.Decimal;profitDelta?:Prisma.Decimal};
export async function mutateFutureWallet(tx:FutureWalletTx,input:Mutation){
  const duplicate=await tx.aiWalletLedger.findUnique({where:{idempotencyKey:input.idempotencyKey}});if(duplicate)return{duplicate:true,ledger:duplicate,wallet:await lockFutureWallet(tx,input.userId)};
  const before=await lockFutureWallet(tx,input.userId),availableAfter=before.availableFuture.add(input.availableDelta),lockedAfter=before.lockedFuture.add(input.lockedDelta??ZERO),profitAfter=before.completedProfit.add(input.profitDelta??ZERO),retainedAfter=input.operation==="SPOT_TO_FUTURE"?before.retainedPrincipal.add(input.amount):input.operation==="FUTURE_TO_SPOT"?Prisma.Decimal.max(ZERO,before.retainedPrincipal.sub(input.amount.abs())):before.retainedPrincipal;
  if(availableAfter.isNegative()||lockedAfter.isNegative())throw new Error("INSUFFICIENT_FUTURE_BALANCE");
  const wallet=await tx.aiFinancialWallet.update({where:{userId:input.userId},data:{availableFuture:availableAfter,lockedFuture:lockedAfter,completedProfit:profitAfter,retainedPrincipal:retainedAfter,version:{increment:1}}});
  const ledger=await tx.aiWalletLedger.create({data:{idempotencyKey:input.idempotencyKey,userId:input.userId,tradeId:input.tradeId,operation:input.operation,amount:input.amount,availableBefore:before.availableFuture,availableAfter,lockedBefore:before.lockedFuture,lockedAfter,officialAt:input.officialAt}});
  return{duplicate:false,ledger,wallet};
}

export const creditFutureFromSpot=(tx:FutureWalletTx,input:{userId:string;amount:Prisma.Decimal;idempotencyKey:string;officialAt:Date})=>mutateFutureWallet(tx,{...input,operation:"SPOT_TO_FUTURE",availableDelta:input.amount});
export const debitFutureForTransfer=(tx:FutureWalletTx,input:{userId:string;amount:Prisma.Decimal;idempotencyKey:string;officialAt:Date})=>mutateFutureWallet(tx,{...input,operation:"FUTURE_TO_SPOT",amount:input.amount.neg(),availableDelta:input.amount.neg()});
export const lockTradePrincipal=(tx:FutureWalletTx,input:{userId:string;tradeId:string;amount:Prisma.Decimal;idempotencyKey:string;officialAt:Date})=>mutateFutureWallet(tx,{...input,operation:"PRINCIPAL_LOCK",amount:input.amount.neg(),availableDelta:input.amount.neg(),lockedDelta:input.amount});
export const returnTradePrincipal=(tx:FutureWalletTx,input:{userId:string;tradeId:string;amount:Prisma.Decimal;idempotencyKey:string;officialAt:Date})=>mutateFutureWallet(tx,{...input,operation:"PRINCIPAL_RETURN",availableDelta:input.amount,lockedDelta:input.amount.neg()});
export const creditAiProfit=(tx:FutureWalletTx,input:{userId:string;tradeId:string;amount:Prisma.Decimal;idempotencyKey:string;officialAt:Date})=>mutateFutureWallet(tx,{...input,operation:"PROFIT_CREDIT",availableDelta:input.amount,profitDelta:input.amount});

export async function reconcileLegacyMirror(tx:FutureWalletTx,userId:string){const financial=await lockFutureWallet(tx,userId),state=await tx.userState.findUnique({where:{userId},select:{wallet:true}});if(!state)return financial;const legacy=migrateWalletStore(state.wallet),next={...legacy,wallets:{...legacy.wallets,future:{...legacy.wallets.future,balance:Number(financial.availableFuture.toString())}},lockedFutureTradeCapital:Number(financial.lockedFuture.toString()),totalCompletedTradingProfit:Number(financial.completedProfit.toString()),totalFuturePrincipal:Number(financial.retainedPrincipal.toString()),rankAccount:{...legacy.rankAccount,qualifyingFutureCapital:Number(financial.retainedPrincipal.toString())}};await tx.userState.update({where:{userId},data:{wallet:next as unknown as Prisma.InputJsonValue}});return financial}

export async function authoritativeFutureWallet(userId:string){return prisma.$transaction(async tx=>{const wallet=await lockFutureWallet(tx,userId);return wallet},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})}
