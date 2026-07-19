import { describe, expect, it, vi } from "vitest";

vi.mock("server-only",()=>({}));

import { formatUserTimestamp, isValidIanaTimeZone, localCalendarDate, resolveUserTimeZone, startOfLocalMonthUtc } from "@/lib/timezone.server";

describe("user-local timezone handling",()=>{
  const instant="2026-07-19T17:30:00.000Z";

  it.each([
    ["Asia/Kolkata","11:00 PM"],
    ["Asia/Dhaka","11:30 PM"],
    ["Asia/Dubai","9:30 PM"],
    ["Europe/London","6:30 PM"],
    ["America/New_York","1:30 PM"],
  ])("formats the same UTC instant for %s",(timezone,localTime)=>{
    const value=formatUserTimestamp(instant,timezone);
    expect(value).toMatchObject({timestampUtc:instant,localDate:"19 Jul 2026",localTime,localDateTime:`19 Jul 2026, ${localTime}`});
  });

  it("uses country mapping before the internal UTC fallback",()=>{
    expect(resolveUserTimeZone(null,"Bangladesh")).toBe("Asia/Dhaka");
    expect(resolveUserTimeZone("+05:30","United Arab Emirates")).toBe("Asia/Dubai");
    expect(resolveUserTimeZone(null,null)).toBe("UTC");
  });

  it("accepts IANA zones and rejects offset strings or unknown zones",()=>{
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
    expect(isValidIanaTimeZone("+05:30")).toBe(false);
    expect(isValidIanaTimeZone("Mars/Olympus")).toBe(false);
  });

  it("calculates local calendar boundaries without fixed offsets",()=>{
    expect(localCalendarDate("2026-07-19T18:31:00.000Z","Asia/Kolkata")).toBe("2026-07-20");
    expect(startOfLocalMonthUtc(instant,"Asia/Kolkata").toISOString()).toBe("2026-06-30T18:30:00.000Z");
    expect(startOfLocalMonthUtc(instant,"America/New_York").toISOString()).toBe("2026-07-01T04:00:00.000Z");
  });
});
