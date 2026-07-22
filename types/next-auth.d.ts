import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User { uid: string; role: Role; country?: string | null }
  interface Session {
    user: DefaultSession["user"] & { id: string; uid: string; role: Role; country?: string | null };
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser { uid: string; role: Role; country?: string | null }
}
