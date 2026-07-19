import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { retainedFuturePrincipal } from "@/lib/rank-recalculation.server";
import { migrateWalletStore, money } from "@/lib/wallet-data";

const querySchema=z.object({parentUid:z.string().trim().toUpperCase().regex(/^BV\d{6}$/).optional(),search:z.string().trim().max(100).default(""),page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20)});
type ParentRow={id:string;uid:string;name:string};
type MemberRow={id:string;uid:string;name:string;email:string;createdAt:Date;wallet:Prisma.JsonValue|null};
type AggregateRow={rootId:string;totalTeam:bigint;qualifiedTeam:bigint;directCount:bigint;newThisMonth:bigint;totalBusiness:Prisma.Decimal;personalBusiness:Prisma.Decimal};

export async function GET(request:Request){
  try{
    const current=await requireAuthenticatedUser(),url=new URL(request.url),input=querySchema.parse(Object.fromEntries(url.searchParams)),parentUid=input.parentUid??current.uid;
    const parents=await prisma.$queryRaw<ParentRow[]>`WITH RECURSIVE allowed AS (
      SELECT u."id",u."uid",u."name",ARRAY[u."id"] AS "path" FROM "User" u WHERE u."id"=${current.id}
      UNION ALL
      SELECT child."id",child."uid",child."name",parent."path"||child."id" FROM "User" child JOIN allowed parent ON child."sponsorId"=parent."id" WHERE NOT child."id"=ANY(parent."path")
    ) SELECT "id","uid","name" FROM allowed WHERE "uid"=${parentUid} LIMIT 1`;
    const parent=parents[0];if(!parent)return NextResponse.json({error:"Genealogy branch is not available."},{status:403});
    const pattern=`%${input.search.replace(/[\\%_]/g,value=>`\\${value}`)}%`,offset=(input.page-1)*input.pageSize;
    const [countRows,members]=await Promise.all([
      prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "User" u WHERE u."sponsorId"=${parent.id} AND (${input.search}='' OR u."name" ILIKE ${pattern} ESCAPE '\\' OR u."email" ILIKE ${pattern} ESCAPE '\\' OR u."uid" ILIKE ${pattern} ESCAPE '\\')`,
      prisma.$queryRaw<MemberRow[]>`SELECT u."id",u."uid",u."name",u."email",u."createdAt",s."wallet" FROM "User" u LEFT JOIN "UserState" s ON s."userId"=u."id" WHERE u."sponsorId"=${parent.id} AND (${input.search}='' OR u."name" ILIKE ${pattern} ESCAPE '\\' OR u."email" ILIKE ${pattern} ESCAPE '\\' OR u."uid" ILIKE ${pattern} ESCAPE '\\') ORDER BY u."createdAt" DESC,u."id" ASC LIMIT ${input.pageSize} OFFSET ${offset}`
    ]),rootIds=[current.id,...members.map(member=>member.id)],aggregates=rootIds.length?await prisma.$queryRaw<AggregateRow[]>`WITH RECURSIVE tree AS (
      SELECT u."id" AS "rootId",u."id",u."sponsorId",u."createdAt",s."wallet",ARRAY[u."id"] AS "path" FROM "User" u LEFT JOIN "UserState" s ON s."userId"=u."id" WHERE u."id" IN (${Prisma.join(rootIds)})
      UNION ALL
      SELECT tree."rootId",child."id",child."sponsorId",child."createdAt",s."wallet",tree."path"||child."id" FROM "User" child JOIN tree ON child."sponsorId"=tree."id" LEFT JOIN "UserState" s ON s."userId"=child."id" WHERE NOT child."id"=ANY(tree."path")
    ) SELECT tree."rootId",(COUNT(*)-1)::bigint AS "totalTeam",COUNT(*) FILTER (WHERE tree."id"<>tree."rootId" AND COALESCE((tree."wallet"->>'totalFuturePrincipal')::numeric,0)>=50)::bigint AS "qualifiedTeam",COUNT(*) FILTER (WHERE tree."sponsorId"=tree."rootId")::bigint AS "directCount",COUNT(*) FILTER (WHERE tree."id"<>tree."rootId" AND tree."createdAt">=date_trunc('month',CURRENT_TIMESTAMP))::bigint AS "newThisMonth",COALESCE(SUM(COALESCE((tree."wallet"->>'totalFuturePrincipal')::numeric,0)),0) AS "totalBusiness",COALESCE(MAX(CASE WHEN tree."id"=tree."rootId" THEN COALESCE((tree."wallet"->>'totalFuturePrincipal')::numeric,0) END),0) AS "personalBusiness" FROM tree GROUP BY tree."rootId"`:[],byRoot=new Map(aggregates.map(row=>[row.rootId,row]));
    const serialize=(member:MemberRow)=>{const wallet=migrateWalletStore(member.wallet),aggregate=byRoot.get(member.id),qualification=retainedFuturePrincipal(member.wallet);return{id:member.id,uid:member.uid,name:member.name,email:member.email,rank:wallet.rankAccount.currentStar,futureWalletBalance:wallet.wallets.future.balance,totalTeam:Number(aggregate?.totalTeam??0),totalBusiness:money(Number(aggregate?.totalBusiness??0)),qualified:qualification.qualified,directCount:Number(aggregate?.directCount??0),createdAt:member.createdAt.toISOString()}},root=byRoot.get(current.id),totalNetwork=Number(root?.totalTeam??0),qualifiedTeam=Number(root?.qualifiedTeam??0),total=countRows[0]?Number(countRows[0].count):0;
    return NextResponse.json({parent,members:members.map(serialize),pagination:{page:input.page,pageSize:input.pageSize,total,totalPages:Math.max(1,Math.ceil(total/input.pageSize))},summary:{totalNetwork,directTeam:Number(root?.directCount??0),qualifiedTeam,unqualifiedTeam:totalNetwork-qualifiedTeam,newThisMonth:Number(root?.newThisMonth??0),qualifyingBusiness:money(Number(root?.personalBusiness??0))}},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Invalid team query."},{status:400});return NextResponse.json({error:error instanceof Error&&error.message==="UNAUTHENTICATED"?"Authentication required.":"Unable to load team."},{status:error instanceof Error&&error.message==="UNAUTHENTICATED"?401:500})}
}
