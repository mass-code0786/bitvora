import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  requestAdminPasswordReset,
  UserPasswordResetModalView,
} from "@/components/admin/user-password-reset-modal";

const user = {
  id: "user-1",
  uid: "BV100002",
  name: "Target User",
  email: "target@example.com",
  sponsorUid: "BV100001",
  createdAt: 0,
  spotBalance: 0,
  futureBalance: 0,
  lockedCapital: 0,
  qualifyingPrincipal: 0,
  completedAiProfit: 0,
  progress: 0,
  currentStar: 0,
  highestStar: 0,
  qualifiedTeamSize: 0,
  active: true,
  qualified: false,
};

function markup(loading = false, error = "") {
  return renderToStaticMarkup(
    <UserPasswordResetModalView
      user={user}
      newPassword="new-password"
      confirmPassword="new-password"
      loading={loading}
      error={error}
      onNewPasswordChange={() => undefined}
      onConfirmPasswordChange={() => undefined}
      onCancel={() => undefined}
      onSubmit={() => undefined}
    />,
  );
}

describe("admin user password reset modal", () => {
  it("renders the selected user and both actions", () => {
    const html = markup();
    expect(html).toContain("Target User");
    expect(html).toContain("target@example.com");
    expect(html).toContain("Cancel");
    expect(html).toContain("Reset Password");
  });

  it("renders a disabled loading state that prevents duplicate submission", () => {
    const html = markup(true);
    expect(html).toContain("Resetting...");
    expect(html).toMatch(/disabled=""/);
  });

  it("renders safe API errors while retaining the modal", () => {
    const html = markup(false, "Passwords do not match.");
    expect(html).toContain('role="dialog"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Passwords do not match.");
  });

  it("handles success and sends same-origin credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Password reset successfully.",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await requestAdminPasswordReset(
      user.id,
      "new-password",
      "new-password",
      fetcher,
    );
    expect(result).toEqual({
      success: true,
      message: "Password reset successfully.",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/users/user-1/reset-password",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
  });

  it("keeps a safe error when the API fails", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          code: "USER_NOT_FOUND",
          message: "User not found.",
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );
    await expect(
      requestAdminPasswordReset(
        user.id,
        "new-password",
        "new-password",
        fetcher,
      ),
    ).resolves.toEqual({
      success: false,
      code: "USER_NOT_FOUND",
      message: "User not found.",
    });
  });
});
