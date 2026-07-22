import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { assertMutationRequest, isSupportSecurityError, SUPPORT_MESSAGE_LIMIT } from "@/lib/support-security.server";
import { buildSupportAccountContext } from "@/lib/support-account-context.server";
import { databaseRule, diagnoseSupportRule, FALLBACK_RESPONSE, FALLBACK_TOPICS, normalizeSupportText, renderSupportResponse } from "@/lib/support-rules";

const input=z.object({conversationId:z.string().cuid().optional(),message:z.string().trim().min(1).max(SUPPORT_MESSAGE_LIMIT),idempotencyKey:z.string().trim().min(8).max(120)}).strict();
export async function POST(request:Request){
  try{
    const user=await requireAuthenticatedUser();assertMutationRequest(request,user.id);
    const value=input.parse(await request.json()),restriction=await prisma.supportChatRestriction.findUnique({where:{userId:user.id}});
    if(restriction?.banned)return NextResponse.json({error:"Support chat access has been restricted. Please create a support ticket."},{status:403});
    const limit=Math.min(60,Math.max(1,Number(process.env.SUPPORT_RATE_LIMIT)||10)),recent=await prisma.chatMessage.count({where:{role:"USER",createdAt:{gte:new Date(Date.now()-60_000)},conversation:{userId:user.id}}});
    if(recent>=limit)return NextResponse.json({error:"Please wait a moment before sending more messages."},{status:429});
    const existing=await prisma.chatMessage.findFirst({where:{idempotencyKey:value.idempotencyKey,conversation:{userId:user.id}},include:{conversation:{select:{id:true,title:true}}}});
    if(existing){const assistant=await prisma.chatMessage.findFirst({where:{conversationId:existing.conversationId,role:"ASSISTANT",createdAt:{gte:existing.createdAt}},orderBy:[{createdAt:"asc"},{id:"asc"}]});const matched=Boolean(assistant?.supportRuleId);return NextResponse.json({session:existing.conversation,message:assistant,replayed:true,matched,intentKey:matched?assistant?.matchedIntent:null,ruleId:assistant?.supportRuleId??null,matchScore:assistant?.matchScore??0,response:assistant?.message??null,followUps:[],fallbackReason:matched?null:"REPLAYED_UNMATCHED",unmatched:!matched})}
    const records=await prisma.supportRule.findMany({where:{isActive:true},orderBy:[{priority:"desc"},{intentKey:"asc"}]});
    if(records.length===0)return NextResponse.json({error:"Support rules are missing or inactive. Run npm run support:seed-rules.",code:"SUPPORT_RULES_UNAVAILABLE",matched:false,fallbackReason:"NO_ACTIVE_RULES"},{status:503});
    let rules;try{rules=records.map(databaseRule)}catch(error){console.error(JSON.stringify({component:"support-rule-engine",event:"invalid_rule_data",error:error instanceof Error?error.message:"INVALID_SUPPORT_RULE_JSON"}));return NextResponse.json({error:"Support knowledge base is temporarily unavailable.",code:"SUPPORT_RULE_DATA_INVALID",matched:false,fallbackReason:"INVALID_RULE_DATA"},{status:503})}const diagnostics=diagnoseSupportRule(value.message,rules),matched=diagnostics.match;
    let session=value.conversationId?await prisma.chatSession.findFirst({where:{id:value.conversationId,userId:user.id,deletedAt:null},select:{id:true,title:true}}):null;
    if(value.conversationId&&!session)return NextResponse.json({error:"Chat not found."},{status:404});
    session=session??await prisma.chatSession.create({data:{userId:user.id,title:value.message.slice(0,54)},select:{id:true,title:true}});
    let response=FALLBACK_RESPONSE,followUps=FALLBACK_TOPICS,ruleId:string|null=null,intentKey="UNMATCHED",score=0;
    if(matched){try{const context=await buildSupportAccountContext(user.id);response=renderSupportResponse(matched.rule.response,context)}catch{response="I matched your account question, but your live account details are temporarily unavailable. Please try again shortly or create a support ticket."}followUps=matched.rule.followUps;ruleId=matched.rule.id;intentKey=matched.rule.intentKey;score=matched.score}else console.warn(JSON.stringify({component:"support-rule-engine",event:"unmatched_query",normalizedMessage:diagnostics.normalizedMessage,bestRuleIntent:diagnostics.bestRuleIntent,bestScore:diagnostics.bestScore,minimumThreshold:diagnostics.minimumThreshold,matchedTerms:diagnostics.matchedTerms,fallbackReason:diagnostics.fallbackReason}));
    const now=new Date(),result=await prisma.$transaction(async tx=>{const userMessage=await tx.chatMessage.create({data:{conversationId:session!.id,role:"USER",message:value.message,idempotencyKey:value.idempotencyKey}}),assistant=await tx.chatMessage.create({data:{conversationId:session!.id,role:"ASSISTANT",message:response,matchedIntent:intentKey,supportRuleId:ruleId,matchScore:score}});if(!matched)await tx.supportUnmatchedQuery.create({data:{userId:user.id,message:value.message,normalizedMessage:normalizeSupportText(value.message)}});await tx.chatSession.update({where:{id:session!.id},data:{lastMessageAt:now}});return{userMessage,assistant}});
    return NextResponse.json({session,message:result.assistant,matched:Boolean(matched),intentKey:matched?.rule.intentKey??null,ruleId,matchScore:score,response,followUps,fallbackReason:matched?null:diagnostics.fallbackReason,matchedIntent:intentKey,unmatched:!matched});
  }catch(error){
    if(isSupportSecurityError(error))return NextResponse.json({error:"Your secure session could not be verified. Please refresh the page and try again.",code:"SUPPORT_SECURITY_VALIDATION_FAILED"},{status:403});
    const message=error instanceof z.ZodError?error.issues[0]?.message??"Invalid message.":"Unable to answer right now. Please create a support ticket.";return NextResponse.json({error:message},{status:400});
  }
}
