import { Prisma } from "@prisma/client";

export type SponsorIdentity={id:string;uid:string};
export type SponsorLink={id:string;sponsorId:string|null;sponsorUid:string|null};

export function isCanonicalDirectMember(parent:SponsorIdentity,user:SponsorLink){
  return user.sponsorId===parent.id||user.sponsorUid===parent.uid;
}

export function canonicalDirectMembers(parent:SponsorIdentity,users:readonly SponsorLink[]){
  return [...new Map(users.filter(user=>isCanonicalDirectMember(parent,user)).map(user=>[user.id,user])).values()];
}

export function canonicalDirectMemberWhere(parent:SponsorIdentity){
  return Prisma.sql`(u."sponsorId"=${parent.id} OR u."sponsorUid"=${parent.uid})`;
}
