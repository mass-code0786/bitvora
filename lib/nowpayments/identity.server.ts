import "server-only";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import type { DepositUser } from "./deposit-service.server";
export async function getDepositUser():Promise<DepositUser>{if(process.env.NEXT_PUBLIC_BACKEND_AUTH_ENABLED==="true"){const user=await requireAuthenticatedUser();return{id:user.id,uid:user.uid}}return{id:"BTV10001",uid:"BV100001"}}
