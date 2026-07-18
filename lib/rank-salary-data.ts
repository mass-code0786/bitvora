import { ranks } from "@/lib/config";

export type RankStateStatus="Achieved"|"Current"|"Locked";
export type SalaryStatus="Paid"|"Upcoming"|"Missed"|"Pending";

export const currentRank=ranks[0];
export const nextRank=ranks[0];
export const remainingTeam=nextRank.team;
export const teamCompletion=0;
export const directStarCompletion=0;
export const overallRankCompletion=0;
export const totalRewardsEarned=0;
export const rankTimeline=ranks.map(rank=>({...rank,name:`${rank.star} Star`,status:"Locked" as RankStateStatus,achievedDate:undefined}));
export const rankHistory:[]=[];
export const salaryCycles:ReadonlyArray<{id:string;cycle:string;date:string;amount:number;rank:string;status:SalaryStatus}>=[];
export const salaryHistory:typeof salaryCycles=[];
export const totalSalaryEarned=0;
export const eligibilityChecklist=[
  {id:"rank",label:"Current rank achieved",detail:"No rank data",complete:false},
  {id:"team",label:"Team requirement completed",detail:"No team data",complete:false},
  {id:"direct",label:"Direct-star condition completed",detail:"No direct-rank data",complete:false},
  {id:"account",label:"Account active",detail:"No qualification data",complete:false},
  {id:"plan",label:"Working Plan active",detail:"No qualification data",complete:false},
] as const;
export const salaryProjection={currentAnnual:0,nextAnnual:0,increase:0};
export const rankSalaryNotifications:ReadonlyArray<{id:string;title:string;text:string;tone:string}>=[];
