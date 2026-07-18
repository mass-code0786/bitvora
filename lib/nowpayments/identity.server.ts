import "server-only";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import type { DepositUser } from "./deposit-service.server";
export async function getDepositUser():Promise<DepositUser>{const user=await requireAuthenticatedUser();return{id:user.id,uid:user.uid}}
