export type WithdrawalPublicStatus="Pending Admin Review"|"Processing"|"Broadcasted"|"Confirming"|"Completed"|"Rejected"|"Failed"|"Under Review";
export const publicWithdrawalStatus=(status:string):WithdrawalPublicStatus=>{
  if(status==="PENDING_ADMIN_REVIEW")return"Pending Admin Review";
  if(status==="BROADCASTED")return"Broadcasted";
  if(status==="CONFIRMING")return"Confirming";
  if(status==="COMPLETED")return"Completed";
  if(status==="REJECTED")return"Rejected";
  if(status==="CANCELLED")return"Failed";
  if(status==="MANUAL_REVIEW")return"Under Review";
  return"Processing";
};
export const withdrawalResponse=(value:{id:string;status:string;requestedAmount:{toString():string};platformFee:{toString():string};recipientAmount:{toString():string};network:string;destinationAddress:string;txHash:string|null;confirmations:number;requiredConfirmations:number;createdAt?:Date;processingMode?:string})=>({
  withdrawalId:value.id,status:value.status,displayStatus:publicWithdrawalStatus(value.status),
  requestedAmount:value.requestedAmount.toString(),fee:value.platformFee.toString(),
  recipientAmount:value.recipientAmount.toString(),network:value.network,
  destinationAddress:value.destinationAddress,txHash:value.txHash,
  confirmations:value.confirmations,requiredConfirmations:value.requiredConfirmations,createdAt:value.createdAt?.toISOString()??null,processingMode:value.processingMode??null
});
