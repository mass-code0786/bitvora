import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/lib/auth/registration";

describe("registration input", () => {
  it("normalizes accepted registration data", () => {
    const result = registrationSchema.parse({ name: " Alex ", email: " A@EXAMPLE.COM ", password: "password123", referralUid: " bv100001 ",countryCode:"in" });
    expect(result).toMatchObject({ name: "Alex", email: "a@example.com", referralUid: "BV100001",countryCode:"IN" });
  });
  it("rejects malformed input and referral UIDs", () => {
    expect(registrationSchema.safeParse({ name: "A", email: "bad", password: "short", referralUid: "BV12" }).success).toBe(false);
  });
  it("requires a valid manually selected country",()=>{expect(registrationSchema.safeParse({name:"Alex",email:"a@example.com",password:"password123",countryCode:""}).error?.issues[0]?.message).toBe("Please select your country.");expect(registrationSchema.safeParse({name:"Alex",email:"a@example.com",password:"password123",countryCode:"XX"}).success).toBe(false)});
});
