import { rankSalaryDemo, ranks, salaryPlan } from "@/lib/config";

export type RankStateStatus = "Achieved" | "Current" | "Locked";
export type SalaryStatus = "Paid" | "Upcoming" | "Missed" | "Pending";

export const currentRank = ranks.find(rank => rank.star === rankSalaryDemo.currentStar)!;
export const nextRank = ranks.find(rank => rank.star === rankSalaryDemo.currentStar + 1)!;
export const remainingTeam = Math.max(0, nextRank.team - rankSalaryDemo.totalTeam);
export const teamCompletion = Math.min(100, Math.round(rankSalaryDemo.totalTeam / nextRank.team * 100));
export const directStarCompletion = nextRank.directStars.count === 0 ? 100 : Math.min(100, Math.round(rankSalaryDemo.nextRankDirectStarsAchieved / nextRank.directStars.count * 100));
export const overallRankCompletion = Math.min(teamCompletion, directStarCompletion);
export const totalRewardsEarned = ranks.filter(rank => rank.star <= rankSalaryDemo.currentStar).reduce((sum, rank) => sum + rank.reward, 0);

export const rankTimeline = ranks.map(rank => ({
  ...rank,
  name: `${rank.star}${rank.star === 1 ? "st" : rank.star === 2 ? "nd" : rank.star === 3 ? "rd" : "th"} Star`,
  status: (rank.star < rankSalaryDemo.currentStar ? "Achieved" : rank.star === rankSalaryDemo.currentStar ? "Current" : "Locked") as RankStateStatus,
  achievedDate: rankSalaryDemo.achievedDates[rank.star],
}));

export const rankHistory = rankTimeline.filter(rank => rank.achievedDate).map(rank => ({
  id: `RNK-2026-${String(rank.star).padStart(3,"0")}`,
  rank: rank.name,
  achievedDate: rank.achievedDate!,
  teamCount: rank.team,
  reward: rank.reward,
  status: "Recorded" as const,
}));

export const salaryCycles = [
  { id:"SAL-260501", cycle:"May · Cycle 1", date:"2026-05-01", amount:30, rank:"2nd Star", status:"Paid" },
  { id:"SAL-260515", cycle:"May · Cycle 2", date:"2026-05-15", amount:30, rank:"2nd Star", status:"Paid" },
  { id:"SAL-260601", cycle:"June · Cycle 1", date:"2026-06-01", amount:30, rank:"2nd Star", status:"Paid" },
  { id:"SAL-260615", cycle:"June · Cycle 2", date:"2026-06-15", amount:30, rank:"2nd Star", status:"Missed" },
  { id:"SAL-260701", cycle:"July · Cycle 1", date:"2026-07-01", amount:30, rank:"2nd Star", status:"Paid" },
  { id:"SAL-260715", cycle:"July · Cycle 2", date:"2026-07-15", amount:30, rank:"2nd Star", status:"Pending" },
  { id:"SAL-260801", cycle:"August · Cycle 1", date:"2026-08-01", amount:30, rank:"2nd Star", status:"Upcoming" },
  { id:"SAL-260815", cycle:"August · Cycle 2", date:"2026-08-15", amount:30, rank:"2nd Star", status:"Upcoming" },
  { id:"SAL-260901", cycle:"September · Cycle 1", date:"2026-09-01", amount:30, rank:"2nd Star", status:"Pending" },
  { id:"SAL-260915", cycle:"September · Cycle 2", date:"2026-09-15", amount:30, rank:"2nd Star", status:"Pending" },
  { id:"SAL-261001", cycle:"October · Cycle 1", date:"2026-10-01", amount:30, rank:"2nd Star", status:"Pending" },
  { id:"SAL-261015", cycle:"October · Cycle 2", date:"2026-10-15", amount:30, rank:"2nd Star", status:"Pending" },
] as const satisfies ReadonlyArray<{id:string;cycle:string;date:string;amount:number;rank:string;status:SalaryStatus}>;

export const salaryHistory = salaryCycles.filter(cycle => Date.parse(cycle.date) <= Date.parse("2026-07-15"));
export const totalSalaryEarned = salaryHistory.filter(cycle => cycle.status === "Paid").reduce((sum, cycle) => sum + cycle.amount, 0);

export const eligibilityChecklist = [
  { id:"rank", label:"Current rank achieved", detail:"2nd Star recorded", complete:true },
  { id:"team", label:"Team requirement completed", detail:`${rankSalaryDemo.totalTeam} total team`, complete:true },
  { id:"direct", label:"Direct-star condition completed", detail:"1 direct 1st Star verified", complete:true },
  { id:"account", label:"Account active", detail:"Demo account in good standing", complete:rankSalaryDemo.accountActive },
  { id:"plan", label:"Working Plan active", detail:"Minimum plan qualification met", complete:rankSalaryDemo.workingPlanActive },
] as const;

export const salaryProjection = {
  currentAnnual: currentRank.salary * salaryPlan.cyclesPerYear,
  nextAnnual: nextRank.salary * salaryPlan.cyclesPerYear,
  increase: (nextRank.salary - currentRank.salary) * salaryPlan.cyclesPerYear,
};

export const rankSalaryNotifications = [
  {id:"rank",title:"Rank achieved",text:"2nd Star achievement is recorded in demo history.",tone:"blue"},
  {id:"reward",title:"One-time reward recorded",text:"The $60 demo reward is shown in rank history.",tone:"success"},
  {id:"salary",title:"Salary credited",text:"A demo salary cycle was marked Paid.",tone:"success"},
  {id:"upcoming",title:"Salary upcoming",text:"The next cycle is scheduled for August 1.",tone:"blue"},
  {id:"incomplete",title:"Salary eligibility incomplete",text:"A missed cycle remains visible for review.",tone:"muted"},
  {id:"milestone",title:"Next-rank progress milestone",text:`${teamCompletion}% of the 3rd Star team target reached.`,tone:"blue"},
] as const;
