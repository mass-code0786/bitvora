import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "./normalization";
import { verifyPassword } from "./password";

export const credentialsSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  password: z.string().min(1),
});

export async function verifyLoginCredentials(input: unknown) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return null;
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !await verifyPassword(user.passwordHash, parsed.data.password)) return null;
  return { id: user.id, uid: user.uid, email: user.email, name: user.name, role: user.role };
}
