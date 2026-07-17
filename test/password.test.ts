import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Argon2id passwords", () => {
  it("hashes and verifies without storing plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("correct horse");
    await expect(verifyPassword(hash, "correct horse battery staple")).resolves.toBe(true);
  });
  it("rejects invalid passwords", async () => {
    const hash = await hashPassword("valid-passphrase");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
    expect(() => hashPassword("   ")).toThrow();
  });
});
