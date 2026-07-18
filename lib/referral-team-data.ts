export type TeamStatus="Active"|"Inactive";
export type PlanStatus="Working Plan"|"Not Qualified";
export type ReferralHistoryStatus="Credited"|"Pending"|"Rejected";
export type TeamMember={id:string;userId:string;uid:string;name:string;initials:string;level:1|2|3|4|5;sponsorId:string;sponsorUid:string;sponsorName:string;joinDate:string;firstFutureTransfer:number;planStatus:PlanStatus;status:TeamStatus;rank:string;personalBusiness:number;teamBusiness:number;directTeam:number;totalTeam:number;referralIncome:number};
export type ReferralIncomeRecord={id:string;memberId:string;member:string;kind:"Direct"|"Level";level:number;transfer:number;percent:number;amount:number;date:string;status:ReferralHistoryStatus};
export type SponsorRecord={id:string;sponsorId:string;uid?:string;sponsorUid?:string;qualifyingFutureCapital?:number;currentStar?:number;rewardedRanks?:number[]};

// Network records are populated from authenticated backend data. Until then,
// consumers receive honest empty collections rather than generated members.
export const teamMembers:TeamMember[]=[];
export const directReferrals:TeamMember[]=[];
export const referralHistory:ReferralIncomeRecord[]=[];
export const referralNotifications:ReadonlyArray<{id:string;title:string;text:string;tone:string}>=[];
export const levelBreakdown=Array.from({length:5},(_,index)=>({level:index+1,count:0,active:0,business:0,income:0,share:0}));
export const teamTotals={total:0,direct:0,active:0,inactive:0,newThisMonth:0,business:0};
export const incomeTotals={direct:0,level:0,transactions:0};
export const ROOT_USER_ID="BTV10001";
export const ROOT_USER_UID="BV100001";
export const normalizeUid=(value:string)=>value.trim().toUpperCase();
export const isValidUid=(value:string)=>/^BV\d{6,}$/.test(normalizeUid(value));
export const uidForInternalId=(id:string)=>id===ROOT_USER_ID?ROOT_USER_UID:`BV${String(90000+Number(id.replace(/\D/g,""))).padStart(6,"0")}`;
export function getUplineChain(userId:string,depth=6,members:readonly SponsorRecord[]=teamMembers):string[]{const sponsors=new Map(members.map(member=>[member.id,member.sponsorId])),result:string[]=[],visited=new Set<string>([userId]);let current=userId;for(let index=0;index<Math.min(6,Math.max(0,depth));index+=1){const sponsorId=sponsors.get(current);if(!sponsorId||sponsorId===current||visited.has(sponsorId))break;result.push(sponsorId);visited.add(sponsorId);current=sponsorId}return result}
export const getMemberByUid=(uid:string)=>teamMembers.find(member=>member.uid===normalizeUid(uid));
export const getUserByUid=(uid:string)=>normalizeUid(uid)===ROOT_USER_UID?{id:ROOT_USER_ID,uid:ROOT_USER_UID,sponsorId:"",sponsorUid:""}:getMemberByUid(uid);
export const resolveSponsorFromUid=(uid:string)=>{const user=getUserByUid(uid);return user?.sponsorUid?getUserByUid(user.sponsorUid):undefined};
export const referralCode="";
export const referralLink="";
export const childrenFor=(id:string)=>teamMembers.filter(member=>member.sponsorId===id);
