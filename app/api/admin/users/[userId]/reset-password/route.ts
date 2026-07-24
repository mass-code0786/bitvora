import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AdminAuthorizationError,
} from "@/lib/auth/admin-authorization";
import { requireAdminUser } from "@/lib/auth/server";
import {
  AdminPasswordResetError,
  adminPasswordResetSchema,
  resetUserPassword,
} from "@/lib/admin/user-password-reset.server";

type FailureCode =
  | "NO_SESSION"
  | "ADMIN_ROLE_REQUIRED"
  | "USER_NOT_FOUND"
  | "PASSWORD_MISMATCH"
  | "INVALID_PASSWORD"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

function failure(status: number, code: FailureCode, message: string) {
  return NextResponse.json({ success: false, code, message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await requireAdminUser();
    const { userId } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure(400, "INVALID_REQUEST", "Invalid request.");
    }

    const parsed = adminPasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      const mismatch = parsed.error.issues.some(
        (issue) =>
          issue.path[0] === "confirmPassword" &&
          "params" in issue &&
          issue.params?.code === "PASSWORD_MISMATCH",
      );
      return failure(
        400,
        mismatch ? "PASSWORD_MISMATCH" : "INVALID_PASSWORD",
        mismatch
          ? "Passwords do not match."
          : (parsed.error.issues[0]?.message ?? "Invalid password."),
      );
    }

    await resetUserPassword(admin.id, userId, parsed.data.newPassword);

    return NextResponse.json(
      { success: true, message: "Password reset successfully." },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return failure(
        error.status,
        error.status === 401 ? "NO_SESSION" : "ADMIN_ROLE_REQUIRED",
        error.status === 401 ? "Authentication required." : "Administrator access required.",
      );
    }

    if (error instanceof AdminPasswordResetError) {
      return failure(error.status, error.code, error.message);
    }

    if (error instanceof z.ZodError) {
      return failure(400, "INVALID_PASSWORD", "Invalid password.");
    }

    return failure(500, "INTERNAL_ERROR", "Unable to reset password.");
  }
}
