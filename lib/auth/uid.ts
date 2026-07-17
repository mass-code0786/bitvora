import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

type UidClient = { user: { findUnique(args: { where: { uid: string }; select: { id: true } }): Promise<{ id: string } | null> } };
export const UID_GENERATION_ATTEMPTS = 12;
export const createUidCandidate = () => `BV${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;

export async function generateUniqueUserUid(transactionClient: UidClient = prisma, candidateFactory = createUidCandidate) {
  for (let attempt = 0; attempt < UID_GENERATION_ATTEMPTS; attempt += 1) {
    const uid = candidateFactory();
    if (!await transactionClient.user.findUnique({ where: { uid }, select: { id: true } })) return uid;
  }
  throw new Error("Unable to allocate a unique user UID.");
}
