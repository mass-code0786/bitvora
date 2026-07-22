import { describe, expect, it } from "vitest";
import { dates } from "@/lib/banner/banner-service.server";

describe("banner UTC schedule validation",()=>{
  const now=Date.parse("2026-07-22T12:00:00.000Z");
  it("accepts a current or future UTC start and preserves UTC instants",()=>{const current=dates("2026-07-22T12:00:00.000Z","2026-07-23T12:00:00.000Z",now),future=dates("2026-07-22T13:00:00.000Z","2026-07-23T13:00:00.000Z",now);expect(current.startsAt?.toISOString()).toBe("2026-07-22T12:00:00.000Z");expect(future.expiresAt?.toISOString()).toBe("2026-07-23T13:00:00.000Z")});
  it("rejects a past start",()=>{expect(()=>dates("2026-07-22T11:00:00.000Z","2026-07-23T12:00:00.000Z",now)).toThrow("Start time must be the current time or a future time.")});
  it("requires expiry after start",()=>{expect(()=>dates("2026-07-22T13:00:00.000Z","2026-07-22T13:00:00.000Z",now)).toThrow("Expiry must be later than the start time.")});
  it("treats now as the start when no explicit start is supplied",()=>{expect(()=>dates("","2026-07-22T11:59:59.000Z",now)).toThrow("Expiry must be later than the start time.");expect(dates("","2026-07-22T12:00:01.000Z",now).expiresAt?.toISOString()).toBe("2026-07-22T12:00:01.000Z")});
});
