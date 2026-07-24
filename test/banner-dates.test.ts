import { describe, expect, it } from "vitest";
import { dates } from "@/lib/banner/banner-service.server";

describe("banner UTC schedule validation",()=>{
  const now=Date.parse("2026-07-22T12:00:00.000Z");
  it("accepts a current or future UTC start and preserves UTC instants",()=>{const current=dates("2026-07-22T12:00:00.000Z","2026-07-23T12:00:00.000Z",now),future=dates("2026-07-22T13:00:00.000Z","2026-07-23T13:00:00.000Z",now);expect(current.startsAt?.toISOString()).toBe("2026-07-22T12:00:00.000Z");expect(future.expiresAt?.toISOString()).toBe("2026-07-23T13:00:00.000Z")});
  it("normalizes a start up to five minutes behind to server time",()=>{for(const start of ["2026-07-22T11:59:59.000Z","2026-07-22T11:55:00.000Z"])expect(dates(start,"2026-07-23T12:00:00.000Z",now).startsAt?.toISOString()).toBe("2026-07-22T12:00:00.000Z")});
  it("rejects a start more than five minutes behind and reports server time",()=>{expect(()=>dates("2026-07-22T11:54:59.999Z","2026-07-23T12:00:00.000Z",now)).toThrow("Start time is more than 5 minutes in the past. Server current time: 2026-07-22T12:00:00.000Z.")});
  it("requires expiry after start",()=>{expect(()=>dates("2026-07-22T13:00:00.000Z","2026-07-22T13:00:00.000Z",now)).toThrow("Expiry must be later than the start time.")});
  it("treats now as the start when no explicit start is supplied",()=>{expect(()=>dates("","2026-07-22T11:59:59.000Z",now)).toThrow("Expiry must be later than the start time.");expect(dates("","2026-07-22T12:00:01.000Z",now).expiresAt?.toISOString()).toBe("2026-07-22T12:00:01.000Z")});
  it("checks expiry against a normalized slightly-past start",()=>{expect(()=>dates("2026-07-22T11:58:00.000Z","2026-07-22T11:59:00.000Z",now)).toThrow("Expiry must be later than the start time.");expect(dates("2026-07-22T11:58:00.000Z","2026-07-22T12:00:01.000Z",now).startsAt?.getTime()).toBe(now)});
});
