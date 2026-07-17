import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/lib/auth/registration";

describe("registration input", () => {
  it("normalizes accepted registration data", () => {
    const result = registrationSchema.parse({ name: " Alex ", email: " A@EXAMPLE.COM ", password: "password123", referralUid: " bv100001 " });
    expect(result).toMatchObject({ name: "Alex", email: "a@example.com", referralUid: "BV100001" });
  });
  it("rejects malformed input and referral UIDs", () => {
    expect(registrationSchema.safeParse({ name: "A", email: "bad", password: "short", referralUid: "BV12" }).success).toBe(false);
  });
});
