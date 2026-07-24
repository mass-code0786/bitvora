export const withdrawalStatuses = [
  "PENDING_ADMIN_REVIEW","REQUESTED","VALIDATING","QUEUED","PROCESSING",
  "BROADCASTED","CONFIRMING","COMPLETED","RETRYABLE_FAILED","MANUAL_REVIEW",
  "REJECTED","CANCELLED",
] as const;

export type AdminWithdrawalResponse = {
  id:string; user:{id:string;uid:string;name:string|null;email:string|null}|null;
  requestedAmount:string; platformFee:string; recipientAmount:string;
  destinationAddress:string; network:string; createdAt:string|null;
  userLocalDate:string|null; status:string; processingMode:string|null;
  previousHistoryCount:number; rejectionReason:string|null; txHash:string|null;
};

type WithdrawalRecord = {
  id:string; user?:{id:string;uid:string;name:string|null;email:string|null}|null;
  requestedAmount:{toString():string}; platformFee:{toString():string};
  recipientAmount:{toString():string}; destinationAddress:string; network:string;
  createdAt:Date|null; userLocalDate:string|null; status:string;
  processingMode:string|null; rejectionReason:string|null; txHash:string|null;
};

export function adminWithdrawalResponse(row:WithdrawalRecord,previousHistoryCount:number):AdminWithdrawalResponse {
  return {
    id:row.id,
    user:row.user?{id:row.user.id,uid:row.user.uid,name:row.user.name??null,email:row.user.email??null}:null,
    requestedAmount:row.requestedAmount.toString(),
    platformFee:row.platformFee.toString(),
    recipientAmount:row.recipientAmount.toString(),
    destinationAddress:row.destinationAddress,
    network:row.network,
    createdAt:row.createdAt?.toISOString()??null,
    userLocalDate:row.userLocalDate??null,
    status:String(row.status),
    processingMode:row.processingMode??null,
    previousHistoryCount,
    rejectionReason:row.rejectionReason??null,
    txHash:row.txHash??null,
  };
}

export function isKnownWithdrawalStatus(status:string) {
  return (withdrawalStatuses as readonly string[]).includes(status);
}
