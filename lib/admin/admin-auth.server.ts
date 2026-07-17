import "server-only";
import { requireAdminUser } from "@/lib/auth/server";
export async function requireDemoAdmin(){const user=await requireAdminUser();return{id:user.id,email:user.email??"",uid:user.uid,role:user.role}}
