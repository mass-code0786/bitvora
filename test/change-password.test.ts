import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  verify: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ requireAuthenticatedUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/auth/password", () => ({
  PASSWORD_MIN_LENGTH: 8,
  verifyPassword: mocks.verify,
  hashPassword: mocks.hash,
}));

import { POST } from "@/app/api/account/change-password/route";

const request = (body: unknown) => new Request("http://localhost/api/account/change-password", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("change password endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.findUnique.mockResolvedValue({ passwordHash: "old-hash" });
  });

  it("rejects an incorrect current password without updating PostgreSQL", async () => {
    mocks.verify.mockResolvedValue(false);
    const response = await POST(request({ currentPassword: "wrong", newPassword: "new-password" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "CURRENT_PASSWORD_INCORRECT" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("enforces the minimum password length on the server", async () => {
    const response = await POST(request({ currentPassword: "correct", newPassword: "short" }));
    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stores only a newly generated password hash", async () => {
    mocks.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mocks.hash.mockResolvedValue("new-hash");
    mocks.update.mockResolvedValue({ id: "user-1" });
    const response = await POST(request({ currentPassword: "correct-password", newPassword: "new-password" }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, message: "Password updated successfully." });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { passwordHash: "new-hash" } });
    expect(JSON.stringify(payload)).not.toContain("new-password");
  });
});
