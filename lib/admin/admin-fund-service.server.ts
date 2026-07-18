import "server-only";
import { Prisma } from "@prisma/client";
import { createEmptyTradingStore } from "@/lib/ai-trading-engine";
import { creditSpotDeposit, deductSpotFund, migrateWalletStore, money } from "@/lib/wallet-data";
import { prisma } from "@/lib/prisma";

export type AdminFundAction="CREDIT"|"DEDUCT";
export class AdminFundError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}
type Input={userUid:string;action:AdminFundAction;amount:number;reason:string;idempotencyKey:string;admin:{id:string;uid:string}};
type RecordShape={id:string;idempotencyKey:string;userUid:string;userName:string;action:string;amount:Prisma.Decimal;reason:string;adminId:string;adminUid:string;previousBalance:Prisma.Decimal;newBalance:Prisma.Decimal;ledgerTransactionId:string;status:string;createdAt:Date};
const serialize=(record:RecordShape)=>({...record,amount:Number(record.amount),previousBalance:Number(record.previousBalance),newBalance:Number(record.newBalance),createdAt:record.createdAt.getTime()});

export async function applyAdminFund(input:Input){
  const amount=money(input.amount),reason=input.reason.trim();
  if(amount<=0)throw new AdminFundError("INVALID_AMOUNT","Amount must be greater than 0.");
  if(!reason)throw new AdminFundError("REASON_REQUIRED","Reason is required.");
  return prisma.$transaction(async database=>{
    const existing=await database.adminFundTransaction.findUnique({where:{idempotencyKey:input.idempotencyKey}});
    if(existing){
      if(existing.userUid!==input.userUid||existing.action!==input.action||Number(existing.amount)!==amount||existing.reason!==reason)throw new AdminFundError("IDEMPOTENCY_CONFLICT","Idempotency key was already used for another request.",409);
      return{transaction:serialize(existing),duplicate:true};
    }
    const user=await database.user.findUnique({where:{uid:input.userUid},include:{state:true}});
    if(!user)throw new AdminFundError("USER_NOT_FOUND","User not found.",404);
    const current=migrateWalletStore(user.state?.wallet),previousBalance=current.wallets.spot.balance;
    if(input.action==="DEDUCT"&&amount>previousBalance)throw new AdminFundError("INSUFFICIENT_BALANCE","Available Spot balance is insufficient.",409);
    const timestamp=Date.now(),key=`ADMIN_FUND:${input.idempotencyKey}`,reference=`Admin ${input.action.toLowerCase()} · ${input.admin.uid} · ${reason}`;
    const next=input.action==="CREDIT"
      ?creditSpotDeposit(current,{key,userId:user.id,amount,title:"Spot Wallet deposit",reference,timestamp,type:"SPOT_DEPOSIT"})
      :deductSpotFund(current,{key,userId:user.id,amount,title:"Admin fund deduction",reference,timestamp});
    const ledger=next.transactions[0],newBalance=next.wallets.spot.balance;
    if(user.state)await database.userState.update({where:{userId:user.id},data:{wallet:next as unknown as Prisma.InputJsonValue}});
    else await database.userState.create({data:{userId:user.id,wallet:next as unknown as Prisma.InputJsonValue,trading:createEmptyTradingStore() as unknown as Prisma.InputJsonValue}});
    const record=await database.adminFundTransaction.create({data:{idempotencyKey:input.idempotencyKey,userId:user.id,userUid:user.uid,userName:user.name,action:input.action,amount,reason,adminId:input.admin.id,adminUid:input.admin.uid,previousBalance,newBalance,ledgerTransactionId:ledger.id,status:"COMPLETED"}});
    await database.userNotification.create({data:{userId:user.id,title:input.action==="CREDIT"?"Funds credited":"Funds deducted",message:`${amount.toFixed(2)} was ${input.action==="CREDIT"?"credited to":"deducted from"} your Spot Wallet. Reason: ${reason}`,type:input.action==="CREDIT"?"SUCCESS":"WARNING",reference:`ADMIN_FUND_NOTIFICATION:${record.id}`}});
    return{transaction:serialize(record),duplicate:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function getAdminFundUser(uid:string){const user=await prisma.user.findUnique({where:{uid},include:{state:true}});if(!user)return null;const wallet=migrateWalletStore(user.state?.wallet);return{id:user.id,uid:user.uid,name:user.name,email:user.email,spotBalance:wallet.wallets.spot.balance}}
export async function listAdminFundTransactions(limit=100){const records=await prisma.adminFundTransaction.findMany({orderBy:{createdAt:"desc"},take:Math.min(200,Math.max(1,limit))});return records.map(serialize)}
