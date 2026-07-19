import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn(), hashPassword: vi.fn(), generateUid: vi.fn(), recalculate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: (work: (tx: unknown) => unknown) => work({ user: { findUnique: mocks.findUnique, create: mocks.create } }),
} }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("@/lib/auth/uid", () => ({ generateUniqueUserUid: mocks.generateUid }));
vi.mock("@/lib/rank-recalculation.server",()=>({recalculateAuthoritativeNetwork:mocks.recalculate}));
import { registerUser } from "@/lib/auth/registration";

const input = { name: "Alex Morgan", email: "alex@example.com", password: "password123" };

describe("registration service", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.hashPassword.mockResolvedValue("hash"); mocks.generateUid.mockResolvedValue("BV123456"); });
  it("rejects duplicate normalized email", async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: "existing" });
    await expect(registerUser({ ...input, email: " ALEX@EXAMPLE.COM " })).rejects.toMatchObject({ code: "DUPLICATE_EMAIL" });
  });
  it("rejects an unknown referral UID", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(registerUser({ ...input, referralUid: "BV999999" })).rejects.toMatchObject({ code: "INVALID_REFERRAL" });
  });
  it("resolves and stores the real sponsor relationship", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "sponsor-internal", uid: "BV100001" });
    mocks.create.mockResolvedValue({ uid: "BV123456", email: input.email, name: input.name, role: "USER", createdAt: new Date() });
    await registerUser({ ...input, referralUid: "bv100001" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sponsorId: "sponsor-internal", sponsorUid: "BV100001", uid: "BV123456" }) }));
    expect(mocks.recalculate).toHaveBeenCalledOnce();
  });
});
