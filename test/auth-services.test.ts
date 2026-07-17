import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, verify } = vi.hoisted(() => ({ findUnique: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: verify }));
import { verifyLoginCredentials } from "@/lib/auth/credentials";

describe("credential verification", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns safe identity for valid credentials", async () => {
    findUnique.mockResolvedValue({ id: "internal", uid: "BV100001", email: "a@example.com", name: "Alex", role: "USER", passwordHash: "secret-hash" });
    verify.mockResolvedValue(true);
    await expect(verifyLoginCredentials({ email: " A@Example.com ", password: "password123" })).resolves.toEqual({ id: "internal", uid: "BV100001", email: "a@example.com", name: "Alex", role: "USER" });
  });
  it("rejects an invalid password", async () => {
    findUnique.mockResolvedValue({ passwordHash: "secret-hash" }); verify.mockResolvedValue(false);
    await expect(verifyLoginCredentials({ email: "a@example.com", password: "wrong" })).resolves.toBeNull();
  });
});
