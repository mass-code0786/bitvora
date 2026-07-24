import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authStrategy,sessionCookieName } from "@/lib/auth/config";

async function main(){
  const raw=process.argv.find(value=>value.startsWith("--user="))?.slice("--user=".length);
  const email=z.string().email().parse(raw).trim().toLowerCase();
  const user=await prisma.user.findUnique({
    where:{email},
    select:{role:true,withdrawalsSuspended:true,sessions:{select:{expires:true},orderBy:{expires:"desc"}}},
  });
  const now=Date.now(),sessions=user?.sessions??[],validSessions=sessions.filter(session=>session.expires.getTime()>now);
  console.log(JSON.stringify({
    userExists:Boolean(user),
    role:user?.role??null,
    accountStatus:user?(user.withdrawalsSuspended?"WITHDRAWALS_SUSPENDED":"ACTIVE"):null,
    sessionExists:validSessions.length>0,
    sessionCount:sessions.length,
    validSessionCount:validSessions.length,
    latestSessionExpiry:sessions[0]?.expires.toISOString()??null,
    expectedCookieName:sessionCookieName,
    authStrategy,
    authorizationResult:!user?"USER_NOT_FOUND":user.role!=="ADMIN"?"ADMIN_ROLE_REQUIRED":validSessions.length===0?"NO_VALID_SESSION":"AUTHORIZED",
  },null,2));
}

main().catch(error=>{console.error(JSON.stringify({diagnostic:"FAILED",reason:error instanceof z.ZodError?"INVALID_USER_ARGUMENT":"DATABASE_ERROR"}));process.exitCode=1}).finally(()=>prisma.$disconnect());
