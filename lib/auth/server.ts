import "server-only";
import { auth } from "@/auth";

export async function getCurrentUser() {
  return (await auth())?.user ?? null;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
