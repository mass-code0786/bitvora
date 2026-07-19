import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { retainedFuturePrincipal } from "@/lib/rank-recalculation.server";
import { migrateWalletStore, money } from "@/lib/wallet-data";

const querySchema=z.object({parentUid:z.string().trim().toUpperCase().regex(/^BV\d{6}$/).optional(),search:z.string().trim().max(100).default(""),page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20)});
type ParentRow={id:string;uid:string;name:string;selfUid:string;selfName:string;sponsorUid:string|null;sponsorName:string|null};
type MemberRow={id:string;uid:string;name:string;email:string;createdAt:Date;wallet:Prisma.JsonValue|null};
type AggregateRow={rootId:string;totalTeam:bigint;qualifiedTeam:bigint;directCount:bigint;newThisMonth:bigint;totalBusiness:Prisma.Decimal;personalBusiness:Prisma.Decimal};

export async function GET(request:Request){
  try{
    const current=await requireAuthenticatedUser(),url=new URL(request.url),input=querySchema.parse(Object.fromEntries(url.searchParams)),parentUid=input.parentUid??current.uid;
    const parents=await prisma.$queryRaw<ParentRow[]>`WITH RECURSIVE allowed AS (
      SELECT u."id",u."uid",u."name",ARRAY[u."id"] AS "path" FROM "User" u WHERE u."id"=${current.id}
      UNION ALL
      SELECT child."id",child."uid",child."name",parent."path"||child."id" FROM "User" child JOIN allowed parent ON child."sponsorId"=parent."id" WHERE NOT child."id"=ANY(parent."path")
    ) SELECT allowed."id",allowed."uid",allowed."name",root."uid" AS "selfUid",root."name" AS "selfName",sponsor."uid" AS "sponsorUid",sponsor."name" AS "sponsorName" FROM allowed CROSS JOIN "User" root LEFT JOIN "User" sponsor ON sponsor."id"=root."sponsorId" WHERE root."id"=${current.id} AND allowed."uid"=${parentUid} LIMIT 1`;
    const record=parents[0];if(!record)return NextResponse.json({error:"Genealogy branch is not available."},{status:403});
    const parent={id:record.id,uid:record.uid,name:record.name},identity={self:{uid:record.selfUid,name:record.selfName},sponsor:record.sponsorUid?{uid:record.sponsorUid,name:record.sponsorName??"—"}:null};
    const pattern=`%${input.search.replace(/[\\%_]/g,value=>`\\${value}`)}%`,offset=(input.page-1)*input.pageSize;
    const [countRows,members]=await Promise.all([
      prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "User" u WHERE u."sponsorId"=${parent.id} AND (${input.search}='' OR u."name" ILIKE ${pattern} ESCAPE '\\' OR u."email" ILIKE ${pattern} ESCAPE '\\' OR u."uid" ILIKE ${pattern} ESCAPE '\\')`,
      prisma.$queryRaw<MemberRow[]>`SELECT u."id",u."uid",u."name",u."email",u."createdAt",s."wallet" FROM "User" u LEFT JOIN "UserState" s ON s."userId"=u."id" WHERE u."sponsorId"=${parent.id} AND (${input.search}='' OR u."name" ILIKE ${pattern} ESCAPE '\\' OR u."email" ILIKE ${pattern} ESCAPE '\\' OR u."uid" ILIKE ${pattern} ESCAPE '\\') ORDER BY u."createdAt" DESC,u."id" ASC LIMIT ${input.pageSize} OFFSET ${offset}`
    ]),rootIds=[current.id,...members.map(member=>member.id)],aggregates=rootIds.length?await prisma.$queryRaw<AggregateRow[]>`WITH RECURSIVE tree AS (
      SELECT u."id" AS "rootId",u."id",u."sponsorId",u."createdAt",s."wallet",ARRAY[u."id"] AS "path" FROM "User" u LEFT JOIN "UserState" s ON s."userId"=u."id" WHERE u."id" IN (${Prisma.join(rootIds)})
      UNION ALL
      SELECT tree."rootId",child."id",child."sponsorId",child."createdAt",s."wallet",tree."path"||child."id" FROM "User" child JOIN tree ON child."sponsorId"=tree."id" LEFT JOIN "UserState" s ON s."userId"=child."id" WHERE NOT child."id"=ANY(tree."path")
    ), principals AS (
      SELECT tree."rootId",tree."id",tree."sponsorId",tree."createdAt",GREATEST(0,COALESCE(SUM(CASE WHEN entry->>'status'='COMPLETED' AND ((entry->>'type'='SPOT_TO_FUTURE_TRANSFER' AND entry->>'wallet'='future' AND (entry->>'amount')::numeric>0) OR (entry->>'type'='FUTURE_TO_SPOT_TRANSFER' AND entry->>'wallet'='future' AND (entry->>'amount')::numeric<0) OR (entry->>'type'='ADMIN_FUTURE_ADJUSTMENT' AND entry->>'wallet'='future')) THEN (entry->>'amount')::numeric ELSE 0 END),0)) AS "principal" FROM tree LEFT JOIN LATERAL jsonb_array_elements(COALESCE(tree."wallet"->'transactions','[]'::jsonb)) entry ON TRUE GROUP BY tree."rootId",tree."id",tree."sponsorId",tree."createdAt"
    ) SELECT principals."rootId",(COUNT(*)-1)::bigint AS "totalTeam",COUNT(*) FILTER (WHERE principals."id"<>principals."rootId" AND principals."principal">=50)::bigint AS "qualifiedTeam",COUNT(*) FILTER (WHERE principals."sponsorId"=principals."rootId")::bigint AS "directCount",COUNT(*) FILTER (WHERE principals."id"<>principals."rootId" AND principals."createdAt">=date_trunc('month',CURRENT_TIMESTAMP))::bigint AS "newThisMonth",COALESCE(SUM(principals."principal") FILTER (WHERE principals."id"<>principals."rootId"),0) AS "totalBusiness",COALESCE(MAX(principals."principal") FILTER (WHERE principals."id"=principals."rootId"),0) AS "personalBusiness" FROM principals GROUP BY principals."rootId"`:[],byRoot=new Map(aggregates.map(row=>[row.rootId,row]));
    const serialize=(member:MemberRow)=>{const wallet=migrateWalletStore(member.wallet),aggregate=byRoot.get(member.id),qualification=retainedFuturePrincipal(member.wallet);return{id:member.id,uid:member.uid,name:member.name,email:member.email,rank:wallet.rankAccount.currentStar,futureWalletBalance:wallet.wallets.future.balance,totalTeam:Number(aggregate?.totalTeam??0),totalBusiness:money(Number(aggregate?.totalBusiness??0)),qualified:qualification.qualified,directCount:Number(aggregate?.directCount??0),createdAt:member.createdAt.toISOString()}},root=byRoot.get(current.id),totalNetwork=Number(root?.totalTeam??0),qualifiedTeam=Number(root?.qualifiedTeam??0),total=countRows[0]?Number(countRows[0].count):0;
    return NextResponse.json({identity,parent,members:members.map(serialize),pagination:{page:input.page,pageSize:input.pageSize,total,totalPages:Math.max(1,Math.ceil(total/input.pageSize))},summary:{totalNetwork,directTeam:Number(root?.directCount??0),qualifiedTeam,unqualifiedTeam:totalNetwork-qualifiedTeam,newThisMonth:Number(root?.newThisMonth??0),qualifyingBusiness:money(Number(root?.personalBusiness??0))}},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Invalid team query."},{status:400});return NextResponse.json({error:error instanceof Error&&error.message==="UNAUTHENTICATED"?"Authentication required.":"Unable to load team."},{status:error instanceof Error&&error.message==="UNAUTHENTICATED"?401:500})}
}
