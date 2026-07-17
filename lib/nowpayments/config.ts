export const NOWPAYMENTS_NETWORKS={
  USDT_BEP20:{label:"USDT-BEP20",network:"BEP20",payCurrency:"usdtbsc"},
  USDT_TRC20:{label:"USDT-TRC20",network:"TRC20",payCurrency:"usdttrc20"},
} as const;
export type NowPaymentsNetwork=keyof typeof NOWPAYMENTS_NETWORKS;
export const NOWPAYMENTS_PRICE_CURRENCY="usd";
export const NOWPAYMENTS_PENDING_STATUSES=["WAITING","CONFIRMING","CONFIRMED","SENDING","PARTIALLY_PAID"] as const;
export const NOWPAYMENTS_FINAL_STATUSES=["FINISHED","FAILED","REFUNDED","EXPIRED"] as const;
export type DepositPaymentStatus=typeof NOWPAYMENTS_PENDING_STATUSES[number]|typeof NOWPAYMENTS_FINAL_STATUSES[number];
export type DepositCreditStatus="NOT_CREDITED"|"CREDITED"|"MANUAL_REVIEW";
export const normalizePaymentStatus=(value:unknown):DepositPaymentStatus=>{const status=String(value??"").toLowerCase();return({waiting:"WAITING",confirming:"CONFIRMING",confirmed:"CONFIRMED",sending:"SENDING",partially_paid:"PARTIALLY_PAID",finished:"FINISHED",failed:"FAILED",refunded:"REFUNDED",expired:"EXPIRED"} as Record<string,DepositPaymentStatus>)[status]??"WAITING"};
export const isFinalDepositStatus=(status:DepositPaymentStatus)=>NOWPAYMENTS_FINAL_STATUSES.includes(status as typeof NOWPAYMENTS_FINAL_STATUSES[number]);
