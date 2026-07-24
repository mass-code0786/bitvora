import "server-only";
import { auth } from "@/auth";
import { AdminAuthorizationError } from "@/lib/auth/admin-authorization";

export async function getCurrentUser() {
  return (await auth())?.user ?? null;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) throw new AdminAuthorizationError("NO_SESSION",401);
  if (user.role !== "ADMIN") throw new AdminAuthorizationError("ADMIN_ROLE_REQUIRED",403);
  return user;
}
