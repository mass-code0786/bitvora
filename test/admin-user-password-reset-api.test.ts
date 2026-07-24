import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuthorizationError } from "@/lib/auth/admin-authorization";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  resetUserPassword: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/lib/admin/user-password-reset.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/admin/user-password-reset.server")>();
  return { ...original, resetUserPassword: mocks.resetUserPassword };
});

import { POST } from "@/app/api/admin/users/[userId]/reset-password/route";
import { AdminPasswordResetError } from "@/lib/admin/user-password-reset.server";

const request = (body: unknown) =>
  new Request("https://bitvora.zenithsoftech.com/api/admin/users/user-1/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const invoke = (body: unknown, userId = "user-1") =>
  POST(request(body), { params: Promise.resolve({ userId }) });

describe("admin user password reset API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.resetUserPassword.mockResolvedValue({ invalidatedSessionCount: 2 });
  });

  it("allows a valid ADMIN to reset a user's password", async () => {
    const response = await invoke({
      newPassword: "new-password",
      confirmPassword: "new-password",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Password reset successfully.",
    });
    expect(mocks.resetUserPassword).toHaveBeenCalledWith(
      "admin-1",
      "user-1",
      "new-password",
    );
  });

  it("returns 401 without a session", async () => {
    mocks.requireAdminUser.mockRejectedValue(
      new AdminAuthorizationError("NO_SESSION", 401),
    );
    const response = await invoke({
      newPassword: "new-password",
      confirmPassword: "new-password",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "NO_SESSION" });
    expect(mocks.resetUserPassword).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    mocks.requireAdminUser.mockRejectedValue(
      new AdminAuthorizationError("ADMIN_ROLE_REQUIRED", 403),
    );
    const response = await invoke({
      newPassword: "new-password",
      confirmPassword: "new-password",
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      success: false,
      code: "ADMIN_ROLE_REQUIRED",
    });
  });

  it("returns 404 for a missing target user", async () => {
    mocks.resetUserPassword.mockRejectedValue(
      new AdminPasswordResetError("USER_NOT_FOUND", 404, "User not found."),
    );
    const response = await invoke(
      { newPassword: "new-password", confirmPassword: "new-password" },
      "missing",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("returns 400 for mismatched passwords", async () => {
    const response = await invoke({
      newPassword: "new-password",
      confirmPassword: "other-password",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "PASSWORD_MISMATCH" });
    expect(mocks.resetUserPassword).not.toHaveBeenCalled();
  });

  it.each(["", "short", "        "])(
    "uses the existing password policy for invalid value %j",
    async (newPassword) => {
      const response = await invoke({ newPassword, confirmPassword: newPassword });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "INVALID_PASSWORD" });
      expect(mocks.resetUserPassword).not.toHaveBeenCalled();
    },
  );

  it("never returns the password or hash", async () => {
    const secret = "private-password";
    const response = await invoke({ newPassword: secret, confirmPassword: secret });
    const serialized = JSON.stringify(await response.json());
    expect(serialized).not.toContain(secret);
    expect(serialized.toLowerCase()).not.toContain("hash");
  });
});
