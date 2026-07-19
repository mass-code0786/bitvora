import "server-only";
import { prisma } from "@/lib/prisma";
import { formatUserTimestamp, resolveUserTimeZone } from "@/lib/timezone.server";
import type { DemoDepositRecord } from "./deposit-types";
export async function localizeDepositRecord(userId:string,record:DemoDepositRecord){const profile=await prisma.user.findUnique({where:{id:userId},select:{timezone:true,country:true}}),timeZone=resolveUserTimeZone(profile?.timezone,profile?.country);return{...record,localDateTime:formatUserTimestamp(record.createdAt,timeZone).localDateTime,updatedLocalDateTime:formatUserTimestamp(record.updatedAt,timeZone).localDateTime,finishedLocalDateTime:record.finishedAt?formatUserTimestamp(record.finishedAt,timeZone).localDateTime:null,expiresLocalDateTime:record.expiresAt?formatUserTimestamp(record.expiresAt,timeZone).localDateTime:null}}
