import { describe, expect, it } from "vitest";
import { isValidUserUid, normalizeEmail, normalizeUserUid } from "@/lib/auth/normalization";

describe("identity normalization", () => {
  it("validates the exact public UID format", () => {
    expect(isValidUserUid("BV482731")).toBe(true);
    expect(isValidUserUid("BV12345")).toBe(false);
    expect(isValidUserUid("XX482731")).toBe(false);
  });
  it("normalizes UIDs and emails", () => {
    expect(normalizeUserUid(" bv100001 ")).toBe("BV100001");
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
  });
});
