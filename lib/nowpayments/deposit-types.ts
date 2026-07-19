import type { DepositCreditStatus, DepositPaymentStatus, NowPaymentsNetwork } from "./config";
export type DemoDepositRecord={id:string;userId:string;userUid:string;provider:"NOWPAYMENTS";providerPaymentId:string;orderId:string;requestedAmount:number;payAmount:number;payCurrency:string;network:NowPaymentsNetwork;payAddress:string;paymentStatus:DepositPaymentStatus;actuallyPaid:number;amountCredited:number;creditStatus:DepositCreditStatus;txHash:string|null;idempotencyKey:string;createdAt:number;updatedAt:number;finishedAt:number|null;expiresAt:number|null;mock:boolean;adminReviewNote?:string;localDateTime?:string};
export const DEPOSIT_STORE_KEY="bitvora-nowpayments-deposits-v1";
export const readDepositRecords=():DemoDepositRecord[]=>{try{const value=JSON.parse(localStorage.getItem(DEPOSIT_STORE_KEY)??"[]");return Array.isArray(value)?value:[]}catch{return[]}};
export const writeDepositRecords=(records:DemoDepositRecord[])=>localStorage.setItem(DEPOSIT_STORE_KEY,JSON.stringify(records));
export const upsertDepositRecord=(records:DemoDepositRecord[],record:DemoDepositRecord)=>[record,...records.filter(item=>item.id!==record.id)].sort((a,b)=>b.createdAt-a.createdAt);
