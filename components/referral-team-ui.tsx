"use client";
import { createPortal } from "react-dom";
import { Bell, CheckCircle2, Star, X } from "lucide-react";
import type { TeamMember } from "@/lib/referral-team-data";
import { formatCurrency } from "@/lib/currency";

export function MemberAvatar({member,size="md"}:{member:Pick<TeamMember,"initials"|"status">;size?:"sm"|"md"|"lg"}){return <span className={`rt-avatar ${size}`}><b>{member.initials}</b><i className={member.status.toLowerCase()}/></span>}
export function StatusBadge({active}:{active:boolean}){return <span className={`rt-status ${active?"active":"inactive"}`}><i/>{active?"Active":"Inactive"}</span>}

export type DemoNotice={id:string;title:string;text:string;tone?:string};
export function NoticeStack({notices,onClose}:{notices:DemoNotice[];onClose:(id:string)=>void}){if(typeof document==="undefined"||!notices.length)return null;return createPortal(<div className="rt-notice-stack">{notices.map(notice=><button key={notice.id} onClick={()=>onClose(notice.id)} className={notice.tone||"blue"}><Bell size={15}/><span><strong>{notice.title}</strong><small>{notice.text}</small></span><X size={13}/></button>)}</div>,document.body)}

export function MemberDrawer({member,onClose,onFavourite,favourite}:{member:TeamMember|null;onClose:()=>void;onFavourite:(id:string)=>void;favourite:boolean}){
  if(typeof document==="undefined"||!member)return null;
  return createPortal(<div className="rt-drawer-backdrop" onMouseDown={onClose}><aside className="rt-member-drawer" onMouseDown={event=>event.stopPropagation()}>
    <button className="rt-drawer-close" onClick={onClose} aria-label="Close member details"><X size={17}/></button>
    <div className="rt-member-profile"><MemberAvatar member={member} size="lg"/><div><span>Level {member.level} member</span><h2>{member.name}</h2><p>{member.uid}</p></div><button className={favourite?"selected":""} onClick={()=>onFavourite(member.id)} aria-label="Favourite member"><Star size={17} fill={favourite?"currentColor":"none"}/></button></div>
    <div className="rt-drawer-badges"><StatusBadge active={member.status==="Active"}/><span className={member.planStatus==="Working Plan"?"qualified":""}><CheckCircle2 size={12}/>{member.planStatus}</span><b>{member.rank}</b></div>
    <dl className="rt-member-facts"><div><dt>Sponsor UID</dt><dd>{member.sponsorUid||"—"}</dd></div><div><dt>Join date</dt><dd>{new Date(member.joinDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</dd></div><div><dt>Direct team</dt><dd>{member.directTeam}</dd></div><div><dt>Total team</dt><dd>{member.totalTeam}</dd></div><div><dt>Personal business</dt><dd>{formatCurrency(member.personalBusiness)}</dd></div><div><dt>Team business</dt><dd>{formatCurrency(member.teamBusiness)}</dd></div><div><dt>Income generated</dt><dd>{formatCurrency(member.referralIncome,{minimumFractionDigits:2})}</dd></div><div><dt>Level position</dt><dd>Level {member.level}</dd></div></dl>
    <div className="rt-demo-note">Frontend presentation only. No commission or wallet transaction is processed from this profile.</div>
  </aside></div>,document.body);
}
