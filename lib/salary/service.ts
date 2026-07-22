import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { addMoney,migrateWalletStore,type WalletTransaction } from "@/lib/wallet-data";

export class SalaryPaymentError extends Error{constructor(public code:string,public transient:boolean,message=code){super(message)}}

export async function paySalary(paymentId:string){return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "SalaryPayment" WHERE "id"=${paymentId} FOR UPDATE`;
  const payment=await tx.salaryPayment.findUnique({where:{id:paymentId},include:{cycle:true,user:{include:{state:true}}}});
  if(!payment)throw new SalaryPaymentError("PAYMENT_NOT_FOUND",false);
  if(payment.paymentStatus==="PAID"||payment.paymentStatus==="SKIPPED")return payment;
  if(payment.eligibilityStatus!=="ELIGIBLE"||payment.salaryAmount.lte(0)){return tx.salaryPayment.update({where:{id:payment.id},data:{paymentStatus:"SKIPPED",skipReason:payment.skipReason??"NO_CURRENT_RANK"}})}
  if(!payment.user.state)await tx.userState.create({data:{userId:payment.userId,wallet:migrateWalletStore(null) as unknown as Prisma.InputJsonValue,trading:createEmptyTradingStore() as unknown as Prisma.InputJsonValue}});
  await tx.$queryRaw`SELECT "userId" FROM "UserState" WHERE "userId"=${payment.userId} FOR UPDATE`;
  const state=await tx.userState.findUniqueOrThrow({where:{userId:payment.userId}}),wallet=migrateWalletStore(state.wallet),ledger=await tx.salaryLedger.findUnique({where:{idempotencyKey:payment.ledgerKey}});
  if(ledger)return tx.salaryPayment.update({where:{id:payment.id},data:{paymentStatus:"PAID",paidAt:ledger.createdAt}});
  const amount=payment.salaryAmount.toDecimalPlaces(2),before=new Prisma.Decimal(String(wallet.wallets.spot.balance)),after=before.add(amount),timestamp=Date.now(),transaction:WalletTransaction={id:`${payment.ledgerKey}:credit`,userId:payment.userId,wallet:"spot",type:"SPOT_SALARY_INCOME",title:`${payment.evaluatedRank} Star salary`,amount:Number(amount.toString()),balanceBefore:Number(before.toString()),balanceAfter:Number(after.toString()),status:"COMPLETED",reference:payment.ledgerKey,timestamp},next={...wallet,wallets:{...wallet.wallets,spot:{...wallet.wallets.spot,balance:Number(after.toString())}},spotIncome:{...wallet.spotIncome,salaryIncome:addMoney(wallet.spotIncome.salaryIncome,Number(amount.toString()))},transactions:[transaction,...wallet.transactions],processedKeys:[payment.ledgerKey,...wallet.processedKeys]};
  await tx.userState.update({where:{userId:payment.userId},data:{wallet:next as unknown as Prisma.InputJsonValue}});
  await tx.salaryLedger.create({data:{idempotencyKey:payment.ledgerKey,salaryPaymentId:payment.id,salaryCycleId:payment.salaryCycleId,userId:payment.userId,amount,balanceBefore:before,balanceAfter:after}});
  const paid=await tx.salaryPayment.update({where:{id:payment.id},data:{paymentStatus:"PAID",paidAt:new Date(),attempts:{increment:1},failureCode:null}});
  await tx.aiOutboxEvent.create({data:{idempotencyKey:`SALARY_NOTIFICATION:${payment.id}`,aggregateType:"SALARY",aggregateId:payment.id,userId:payment.userId,eventType:"SALARY_CREDITED",payload:{paymentId:payment.id,cycleKey:payment.cycle.cycleKey,rank:payment.evaluatedRank,amount:amount.toFixed(2)}}});
  return paid;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15_000,maxWait:5_000})}

export async function finalizeSalaryCycle(cycleId:string){const grouped=await prisma.salaryPayment.groupBy({by:["paymentStatus"],where:{salaryCycleId:cycleId},_count:{_all:true},_sum:{salaryAmount:true}}),count=(status:string)=>grouped.find(row=>row.paymentStatus===status)?._count._all??0,paid=count("PAID"),skipped=count("SKIPPED"),failed=count("FAILED"),pending=count("PENDING"),amount=grouped.find(row=>row.paymentStatus==="PAID")?._sum.salaryAmount??new Prisma.Decimal(0);return prisma.salaryCycle.update({where:{id:cycleId},data:{totalPaid:paid,totalSkipped:skipped,totalFailed:failed,totalAmount:amount,...(pending===0?{status:failed?"PARTIAL_FAILURE":"COMPLETED",completedAt:new Date()}:{status:"RUNNING"})}})}
