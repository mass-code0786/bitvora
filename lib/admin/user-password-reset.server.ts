import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export const USER_PASSWORD_RESET_ACTION = "USER_PASSWORD_RESET";

export const adminPasswordResetSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      .refine(
        (value) => value.trim().length >= PASSWORD_MIN_LENGTH,
        "Password cannot be whitespace only.",
      ),
    confirmPassword: z.string().min(1, "Please confirm the new password."),
  })
  .superRefine(({ newPassword, confirmPassword }, context) => {
    if (newPassword !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
        params: { code: "PASSWORD_MISMATCH" },
      });
    }
  });

export type AdminPasswordResetInput = z.infer<typeof adminPasswordResetSchema>;

export class AdminPasswordResetError extends Error {
  constructor(
    readonly code: "USER_NOT_FOUND",
    readonly status: 404,
    message: string,
  ) {
    super(message);
    this.name = "AdminPasswordResetError";
  }
}

type ResetTransaction = {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    update(args: {
      where: { id: string };
      data: { passwordHash: string };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  session: {
    deleteMany(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
  supportAuditLog: {
    create(args: {
      data: {
        adminUserId: string;
        targetUserId: string;
        action: typeof USER_PASSWORD_RESET_ACTION;
        metadata: Prisma.InputJsonValue;
      };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
};

type ResetDatabase = {
  $transaction<T>(callback: (transaction: ResetTransaction) => Promise<T>): Promise<T>;
};

type ResetDependencies = {
  database: ResetDatabase;
  hash: (password: string) => Promise<string>;
};

const defaultDependencies: ResetDependencies = {
  database: prisma as unknown as ResetDatabase,
  hash: hashPassword,
};

export async function resetUserPassword(
  adminUserId: string,
  targetUserId: string,
  newPassword: string,
  dependencies: ResetDependencies = defaultDependencies,
): Promise<{ invalidatedSessionCount: number }> {
  const passwordHash = await dependencies.hash(newPassword);

  return dependencies.database.$transaction(async (transaction) => {
    const targetUser = await transaction.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new AdminPasswordResetError("USER_NOT_FOUND", 404, "User not found.");
    }

    await transaction.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
      select: { id: true },
    });

    const invalidatedSessions = await transaction.session.deleteMany({
      where: { userId: targetUserId },
    });

    await transaction.supportAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: USER_PASSWORD_RESET_ACTION,
        metadata: {
          invalidatedSessionCount: invalidatedSessions.count,
        },
      },
      select: { id: true },
    });

    return { invalidatedSessionCount: invalidatedSessions.count };
  });
}
