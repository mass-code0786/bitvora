import { describe,expect,it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WithdrawalAdminPanelView } from "@/components/admin/withdrawal-admin-panel";
import { adminWithdrawalResponse } from "@/lib/withdrawals/admin-response";

const row=(overrides:Record<string,unknown>={})=>({
  id:"wd-1",
  user:{id:"user-1",uid:"BV100001",name:"Admin Test",email:"admin@example.com"},
  requestedAmount:"100.00",platformFee:"5.00",recipientAmount:"95.00",
  destinationAddress:"0x12345678",network:"BEP20",createdAt:"2026-07-24T12:00:00.000Z",
  userLocalDate:"2026-07-24",status:"REQUESTED",processingMode:"AUTOMATIC",
  previousHistoryCount:0,rejectionReason:null,txHash:null,...overrides,
});
const render=(rows:ReturnType<typeof row>[],state:"loading"|"ready"|"unauthorized"|"error"="ready")=>
  renderToStaticMarkup(<WithdrawalAdminPanelView rows={rows} state={state} message=""/>);

describe("withdrawal admin panel",()=>{
  it("renders an empty withdrawal list",()=>expect(render([])).toContain("No withdrawals found."));
  it("renders unauthorized responses safely",()=>expect(render([],"unauthorized")).toContain("session has expired"));
  it("renders API failures safely",()=>expect(render([],"error")).toContain("Unable to load withdrawals"));
  it("renders nullable user data without dereferencing it",()=>{const html=render([row({user:null})]);expect(html).toContain("Unknown user");expect(html).toContain("User details unavailable")});
  it("uses a neutral fallback for unknown statuses",()=>{const html=render([row({status:"FUTURE_STATUS"})]);expect(html).toContain("Unknown status");expect(html).toContain("FUTURE_STATUS")});
  it("renders new PENDING_ADMIN_REVIEW records",()=>{const html=render([row({status:"PENDING_ADMIN_REVIEW",processingMode:"ADMIN_FALLBACK"})]);expect(html).toContain("PENDING_ADMIN_REVIEW");expect(html).not.toContain("Unknown status")});
  it("serializes a JSON-safe API DTO",()=>{const value=adminWithdrawalResponse({...row(),requestedAmount:{toString:()=>"100"},platformFee:{toString:()=>"5"},recipientAmount:{toString:()=>"95"},createdAt:new Date("2026-07-24T12:00:00Z")},0);expect(()=>JSON.stringify({withdrawals:[value]})).not.toThrow();expect(value.createdAt).toBe("2026-07-24T12:00:00.000Z")});
  it("renders through React's production-compatible server renderer",()=>{const html=render([row()]);expect(html).toContain("Admin Test");expect(html).toContain("REQUESTED")});
});
