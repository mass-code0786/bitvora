import type { WalletStore, WithdrawalLedgerDetails } from "@/lib/wallet-data";
export type AdminUserRow={id:string;uid:string;name:string;email:string;sponsorUid:string;createdAt:number;spotBalance:number;futureBalance:number;lockedCapital:number;qualifyingPrincipal:number;completedAiProfit:number;progress:number;currentStar:number;highestStar:number;qualifiedTeamSize:number;active:boolean;qualified:boolean};
export type AdminAuditEntry={id:string;adminId:string;actionType:string;targetUid:string;targetRecord:string;before:unknown;after:unknown;reason:string;timestamp:number};
export type AdminNotification={id:string;targetUid:string|"ALL";title:string;message:string;type:string;read:boolean;createdAt:number;adminId:string;idempotencyKey:string};
export type AdminWithdrawalRow={id:string;userId:string;userUid:string;requestedAmount:number;fee:number;netAmount:number;network:WithdrawalLedgerDetails["network"];status:string;createdAt:number};
export type AdminSnapshot={users:AdminUserRow[];wallet:WalletStore;withdrawals?:AdminWithdrawalRow[];trades:number;settledTrades:number;missedTrades:number;metrics:Record<string,number>};
