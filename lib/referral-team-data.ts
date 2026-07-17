import { referralPlan } from "./config";

export type TeamStatus = "Active" | "Inactive";
export type PlanStatus = "Working Plan" | "Not Qualified";
export type ReferralHistoryStatus = "Credited" | "Pending" | "Rejected" | "Demo";

export type TeamMember = {
  id: string;
  userId: string;
  uid: string;
  name: string;
  initials: string;
  level: 1 | 2 | 3 | 4 | 5;
  sponsorId: string;
  sponsorUid: string;
  sponsorName: string;
  joinDate: string;
  firstFutureTransfer: number;
  planStatus: PlanStatus;
  status: TeamStatus;
  rank: string;
  personalBusiness: number;
  teamBusiness: number;
  directTeam: number;
  totalTeam: number;
  referralIncome: number;
};

export type ReferralIncomeRecord = {
  id: string;
  memberId: string;
  member: string;
  kind: "Direct" | "Level";
  level: number;
  transfer: number;
  percent: number;
  amount: number;
  date: string;
  status: ReferralHistoryStatus;
};

type RawTeamMember = Omit<TeamMember,"teamBusiness"|"directTeam"|"totalTeam"|"referralIncome">;

const levelCounts = [12, 18, 17, 15, 13] as const;
const firstNames = ["Maya","Noah","Aria","Leo","Sofia","Ethan","Zara","Liam","Ivy","Owen","Nina","Milo","Ava","Kai","Mira","Elijah","Luna","Ezra","Anaya","Theo","Freya","Aiden","Isla","Rayan","Elena"];
const lastNames = ["Chen","Williams","Patel","Martin","Reed","Kim","Shah","Davis","Morgan","Singh","Garcia","Lee","Walker","Wilson","Clark"];
const ranks = ["Member","Member","1st Star","Member","2nd Star","1st Star"];
const deposits = [0, 50, 75, 100, 150, 250, 500];
export const ROOT_USER_ID="BTV10001";
export const ROOT_USER_UID="BV100001";
export const normalizeUid=(value:string)=>value.trim().toUpperCase();
export const isValidUid=(value:string)=>/^BV\d{6,}$/.test(normalizeUid(value));
export const uidForInternalId=(id:string)=>id===ROOT_USER_ID?ROOT_USER_UID:`BV${String(90000+Number(id.replace(/\D/g,""))).padStart(6,"0")}`;

const raw: RawTeamMember[] = [];
let globalIndex = 0;
let previousLevelIds = ["BTV10001"];
for (let level = 1; level <= 5; level += 1) {
  const currentIds: string[] = [];
  for (let index = 0; index < levelCounts[level - 1]; index += 1) {
    const id = `BTV${String(11001 + globalIndex)}`;
    const name = `${firstNames[globalIndex % firstNames.length]} ${lastNames[(globalIndex * 7 + level) % lastNames.length]}`;
    const sponsorId = previousLevelIds[index % previousLevelIds.length];
    const sponsor = raw.find(member => member.id === sponsorId);
    const active = (globalIndex + level) % 5 !== 0;
    const transfer = active ? deposits[1 + ((globalIndex * 3 + level) % (deposits.length - 1))] : globalIndex % 3 === 0 ? 50 : 0;
    const qualified = transfer >= referralPlan.eligiblePlan;
    raw.push({
      id,
      userId:id,
      uid:uidForInternalId(id),
      name,
      initials: name.split(" ").map(part => part[0]).join(""),
      level: level as TeamMember["level"],
      sponsorId,
      sponsorUid:uidForInternalId(sponsorId),
      sponsorName: sponsor?.name ?? "Alex Morgan",
      joinDate: new Date(2026, 6 - ((globalIndex + level) % 6), 2 + ((globalIndex * 3) % 26), 9 + (globalIndex % 8), (globalIndex * 7) % 60).toISOString(),
      firstFutureTransfer: transfer,
      planStatus: qualified ? "Working Plan" : "Not Qualified",
      status: active ? "Active" : "Inactive",
      rank: ranks[(globalIndex + level) % ranks.length],
      personalBusiness: transfer,
    });
    currentIds.push(id);
    globalIndex += 1;
  }
  previousLevelIds = currentIds;
}

const descendants = (id: string): RawTeamMember[] => {
  const children = raw.filter(member => member.sponsorId === id);
  return children.flatMap(child => [child, ...descendants(child.id)]);
};

export const teamMembers: TeamMember[] = raw.map(member => {
  const downline = descendants(member.id);
  return {
    ...member,
    directTeam: raw.filter(item => item.sponsorId === member.id).length,
    totalTeam: downline.length,
    teamBusiness: member.personalBusiness + downline.reduce((sum, item) => sum + item.personalBusiness, 0),
    referralIncome: downline.filter(item => item.planStatus === "Working Plan").reduce((sum, item) => sum + item.firstFutureTransfer * referralPlan.levelIncomePercent / 100, 0),
  };
});

export const directReferrals = teamMembers.filter(member => member.level === 1);

export type SponsorRecord = { id:string; sponsorId:string;uid?:string;sponsorUid?:string };
export function getUplineChain(userId:string,depth=6,members:readonly SponsorRecord[]=teamMembers):string[]{
  const sponsors=new Map(members.map(member=>[member.id,member.sponsorId]));
  const result:string[]=[],visited=new Set<string>([userId]);
  let current=userId;
  for(let index=0;index<Math.min(6,Math.max(0,depth));index+=1){
    const sponsorId=sponsors.get(current);
    if(!sponsorId||sponsorId===current||visited.has(sponsorId))break;
    result.push(sponsorId);visited.add(sponsorId);current=sponsorId;
  }
  return result;
}
export const getMemberByUid=(uid:string)=>teamMembers.find(member=>member.uid===normalizeUid(uid));
export const getUserByUid=(uid:string)=>normalizeUid(uid)===ROOT_USER_UID?{id:ROOT_USER_ID,uid:ROOT_USER_UID,sponsorId:"",sponsorUid:""}:getMemberByUid(uid);
export const resolveSponsorFromUid=(uid:string)=>{const user=getUserByUid(uid);return user?.sponsorUid?getUserByUid(user.sponsorUid):undefined};

export const referralHistory: ReferralIncomeRecord[] = teamMembers.flatMap((member, index) => {
  const qualified = member.planStatus === "Working Plan";
  const levelRecord: ReferralIncomeRecord = {
    id: `LVL-${member.id}`,
    memberId: member.id,
    member: member.name,
    kind: "Level",
    level: member.level,
    transfer: member.firstFutureTransfer,
    percent: referralPlan.levelIncomePercent,
    amount: qualified ? member.firstFutureTransfer * referralPlan.levelIncomePercent / 100 : 0,
    date: member.joinDate,
    status: qualified ? (index % 9 === 0 ? "Demo" : "Credited") : (index % 2 ? "Rejected" : "Pending"),
  };
  if (member.level !== 1) return [levelRecord];
  const directRecord: ReferralIncomeRecord = {
    ...levelRecord,
    id: `DIR-${member.id}`,
    kind: "Direct",
    level: 1,
    percent: referralPlan.directIncomePercent,
    amount: qualified ? member.firstFutureTransfer * referralPlan.directIncomePercent / 100 : 0,
  };
  return [directRecord, levelRecord];
}).sort((a,b) => Date.parse(b.date) - Date.parse(a.date));

export const referralCode = ROOT_USER_UID;
export const referralLink = `https://bitvora.com/register?ref=${referralCode}`;

export const levelBreakdown = levelCounts.map((count, index) => {
  const level = index + 1;
  const members = teamMembers.filter(member => member.level === level);
  const income = referralHistory.filter(record => record.kind === "Level" && record.level === level && record.status !== "Rejected").reduce((sum, record) => sum + record.amount, 0);
  return {
    level,
    count,
    active: members.filter(member => member.status === "Active").length,
    business: members.reduce((sum, member) => sum + member.personalBusiness, 0),
    income,
    share: Math.round(count / teamMembers.length * 100),
  };
});

export const referralNotifications = [
  { id:"joined", title:"New direct referral joined", text:"Maya Chen joined your Level 1 team.", tone:"blue" },
  { id:"transfer", title:"Referral completed first Future transfer", text:"A qualifying Spot to Future transfer was recorded.", tone:"blue" },
  { id:"direct", title:"Direct income credited", text:"Demo 5% first-transfer commission added to history.", tone:"success" },
  { id:"level", title:"Level income credited", text:"Demo Level 3 income record is now credited.", tone:"success" },
  { id:"active", title:"Team member became active", text:"A member activated the $50 Working Plan.", tone:"blue" },
  { id:"unqualified", title:"Referral did not qualify", text:"First Spot to Future transfer was below $50; the opportunity is consumed.", tone:"muted" },
] as const;

export const teamTotals = {
  total: teamMembers.length,
  direct: directReferrals.length,
  active: teamMembers.filter(member => member.status === "Active").length,
  inactive: teamMembers.filter(member => member.status === "Inactive").length,
  newThisMonth: teamMembers.filter(member => member.joinDate.startsWith("2026-07")).length,
  business: teamMembers.reduce((sum, member) => sum + member.personalBusiness, 0),
};

export const incomeTotals = {
  direct: referralHistory.filter(record => record.kind === "Direct" && record.status !== "Rejected").reduce((sum, record) => sum + record.amount, 0),
  level: referralHistory.filter(record => record.kind === "Level" && record.status !== "Rejected").reduce((sum, record) => sum + record.amount, 0),
  transactions: referralHistory.filter(record => record.amount > 0).length,
};

export const childrenFor = (id: string) => teamMembers.filter(member => member.sponsorId === id);
