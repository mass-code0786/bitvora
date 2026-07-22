import { afterEach, describe, expect, it, vi } from "vitest";
import { browserTimeZone, countryTimeZone, displayTimeZone, formatLocalDateTime } from "@/lib/date-time";

describe("shared browser date/time formatting",()=>{
  afterEach(()=>vi.restoreAllMocks());
  it("maps supported country fallbacks",()=>{expect(countryTimeZone("India")).toBe("Asia/Kolkata");expect(countryTimeZone("UAE")).toBe("Asia/Dubai");expect(countryTimeZone("Bangladesh")).toBe("Asia/Dhaka");expect(countryTimeZone("Nepal")).toBe("Asia/Kathmandu")});
  it("uses the detected browser timezone",()=>{expect(browserTimeZone()).toBeTruthy();expect(displayTimeZone("India")).toBe(browserTimeZone())});
  it("formats a UTC instant for an explicit browser zone",()=>{vi.spyOn(Intl.DateTimeFormat.prototype,"resolvedOptions").mockReturnValue({locale:"en-US",calendar:"gregory",numberingSystem:"latn",timeZone:"Asia/Kathmandu",hourCycle:"h12",hour12:true});expect(formatLocalDateTime("2026-07-22T12:00:00.000Z")).toMatch(/5:45|17:45/)});
});
