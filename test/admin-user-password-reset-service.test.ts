import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  resetUserPassword,
  USER_PASSWORD_RESET_ACTION,
} from "@/lib/admin/user-password-reset.server";

type State = {
  passwordHash: string;
  sessions: Array<{ id: string; userId: string }>;
  audits: Array<Record<string, unknown>>;
  financialRecords: Array<Record<string, unknown>>;
};

function databaseFor(state: State) {
  return {
    async $transaction<T>(
      callback: (transaction: {
        user: {
          findUnique: () => Promise<{ id: string } | null>;
          update: (args: {
            data: { passwordHash: string };
          }) => Promise<{ id: string }>;
        };
        session: {
          deleteMany: (args: {
            where: { userId: string };
          }) => Promise<{ count: number }>;
        };
        supportAuditLog: {
          create: (args: {
            data: Record<string, unknown>;
          }) => Promise<{ id: string }>;
        };
      }) => Promise<T>,
    ) {
      return callback({
        user: {
          findUnique: async () => ({ id: "user-1" }),
          update: async ({ data }) => {
            state.passwordHash = data.passwordHash;
            return { id: "user-1" };
          },
        },
        session: {
          deleteMany: async ({ where }) => {
            const before = state.sessions.length;
            state.sessions = state.sessions.filter(
              (session) => session.userId !== where.userId,
            );
            return { count: before - state.sessions.length };
          },
        },
        supportAuditLog: {
          create: async ({ data }) => {
            state.audits.push(data);
            return { id: `audit-${state.audits.length}` };
          },
        },
      });
    },
  };
}

describe("admin user password reset transaction", () => {
  it("hashes the new password, invalidates only target sessions, and creates a safe audit", async () => {
    const oldPassword = "old-password";
    const newPassword = "new-password";
    const state: State = {
      passwordHash: await hashPassword(oldPassword),
      sessions: [
        { id: "target-1", userId: "user-1" },
        { id: "target-2", userId: "user-1" },
        { id: "admin-session", userId: "admin-1" },
      ],
      audits: [],
      financialRecords: [{ id: "wallet-record", amount: 100 }],
    };
    const financialBefore = structuredClone(state.financialRecords);

    const result = await resetUserPassword("admin-1", "user-1", newPassword, {
      database: databaseFor(state),
      hash: hashPassword,
    });

    expect(result.invalidatedSessionCount).toBe(2);
    expect(state.passwordHash).not.toBe(newPassword);
    await expect(verifyPassword(state.passwordHash, oldPassword)).resolves.toBe(false);
    await expect(verifyPassword(state.passwordHash, newPassword)).resolves.toBe(true);
    expect(state.sessions).toEqual([{ id: "admin-session", userId: "admin-1" }]);
    expect(state.audits).toEqual([
      {
        adminUserId: "admin-1",
        targetUserId: "user-1",
        action: USER_PASSWORD_RESET_ACTION,
        metadata: { invalidatedSessionCount: 2 },
      },
    ]);
    expect(state.audits[0]?.metadata).toEqual({ invalidatedSessionCount: 2 });
    expect(JSON.stringify(state.audits[0]?.metadata)).not.toMatch(
      /password|hash|new-password/i,
    );
    expect(state.financialRecords).toEqual(financialBefore);
  });

  it("invalidates the admin session when an admin resets their own password", async () => {
    const state: State = {
      passwordHash: "old-hash",
      sessions: [{ id: "admin-session", userId: "admin-1" }],
      audits: [],
      financialRecords: [],
    };
    await resetUserPassword("admin-1", "admin-1", "new-password", {
      database: databaseFor(state),
      hash: async () => "safe-hash",
    });
    expect(state.sessions).toEqual([]);
  });

  it("keeps password state valid under concurrent duplicate submissions", async () => {
    const state: State = {
      passwordHash: "old-hash",
      sessions: [{ id: "target-session", userId: "user-1" }],
      audits: [],
      financialRecords: [],
    };
    const database = databaseFor(state);
    await Promise.all([
      resetUserPassword("admin-1", "user-1", "same-password", {
        database,
        hash: hashPassword,
      }),
      resetUserPassword("admin-1", "user-1", "same-password", {
        database,
        hash: hashPassword,
      }),
    ]);
    await expect(verifyPassword(state.passwordHash, "same-password")).resolves.toBe(true);
    expect(state.sessions).toEqual([]);
  });

  it("contains no logging or unrelated persistence in the implementation", () => {
    const source = readFileSync("lib/admin/user-password-reset.server.ts", "utf8");
    const route = readFileSync(
      "app/api/admin/users/[userId]/reset-password/route.ts",
      "utf8",
    );
    expect(`${source}\n${route}`).not.toMatch(/console\.|logger\.|request body/i);
    expect(source).not.toMatch(/wallet|withdrawal|banner|trade|referral/i);
  });
});
