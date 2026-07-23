import { describe, expect, it } from "vitest";
import { canonicalDirectMembers } from "@/lib/direct-members";

const parent={id:"parent-id",uid:"BV100000"};
const count=(users:Parameters<typeof canonicalDirectMembers>[1])=>canonicalDirectMembers(parent,users).length;

describe("Profile canonical direct-referral count",()=>{
  it("counts a sponsorId direct",()=>expect(count([{id:"one",sponsorId:parent.id,sponsorUid:null}])).toBe(1));
  it("counts a legacy sponsorUid direct",()=>expect(count([{id:"legacy",sponsorId:null,sponsorUid:parent.uid}])).toBe(1));
  it("counts a user linked by sponsorId and sponsorUid once",()=>expect(count([{id:"both",sponsorId:parent.id,sponsorUid:parent.uid}])).toBe(1));
  it("counts an unqualified direct because qualification is not an input",()=>expect(count([{id:"unqualified",sponsorId:parent.id,sponsorUid:null}])).toBe(1));
  it("uses the same canonical count exposed to the Team page",()=>{
    const users=[{id:"one",sponsorId:parent.id,sponsorUid:null},{id:"legacy",sponsorId:null,sponsorUid:parent.uid},{id:"both",sponsorId:parent.id,sponsorUid:parent.uid}];
    const profileDirect=count(users),teamDirect=canonicalDirectMembers(parent,users).length;
    expect(profileDirect).toBe(teamDirect);
  });
});
