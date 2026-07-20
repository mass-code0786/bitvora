import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { supportRuleSeeds } from "../lib/support-rules";
const prisma=new PrismaClient();
async function main(){if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required.");for(const item of supportRuleSeeds)await prisma.supportRule.upsert({where:{intentKey:item.intentKey},create:{intentKey:item.intentKey,category:item.category,title:item.title,response:item.response,keywordsJson:item.keywords,examplesJson:item.examples,followUpsJson:item.followUps,priority:item.priority,isActive:item.isActive},update:{category:item.category,title:item.title,response:item.response,keywordsJson:item.keywords,examplesJson:item.examples,followUpsJson:item.followUps,priority:item.priority}});console.log(`Seeded ${supportRuleSeeds.length} Support rules.`)}void main().finally(()=>prisma.$disconnect());
