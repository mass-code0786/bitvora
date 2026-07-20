import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, SUPPORT_MESSAGE_LIMIT } from "@/lib/support-security.server";
import { buildAccountContext, systemInstructions } from "@/lib/ai-support.server";

export const runtime="nodejs";
const input=z.object({conversationId:z.string().cuid().optional(),message:z.string().trim().min(1).max(SUPPORT_MESSAGE_LIMIT)}).strict();
const line=(value:unknown)=>`${JSON.stringify(value)}\n`;

export async function POST(request:Request){
  try{
    assertSameOrigin(request);const user=await requireAuthenticatedUser(),value=input.parse(await request.json());
    const restriction=await prisma.aiSupportRestriction.findUnique({where:{userId:user.id}});if(restriction?.banned)return new Response(line({type:"error",error:"AI chat access has been restricted. Please use a support ticket."}),{status:403,headers:{"content-type":"application/x-ndjson"}});
    const minuteAgo=new Date(Date.now()-60_000),recent=await prisma.chatMessage.count({where:{role:"USER",createdAt:{gte:minuteAgo},conversation:{userId:user.id}}});if(recent>=10)return new Response(line({type:"error",error:"Please wait a moment before sending more messages."}),{status:429,headers:{"content-type":"application/x-ndjson"}});
    let session=value.conversationId?await prisma.chatSession.findFirst({where:{id:value.conversationId,userId:user.id,deletedAt:null}}):null;if(value.conversationId&&!session)return new Response(line({type:"error",error:"Chat not found."}),{status:404,headers:{"content-type":"application/x-ndjson"}});
    const now=new Date();session=session??await prisma.chatSession.create({data:{userId:user.id,title:value.message.slice(0,54),lastMessageAt:now}});await prisma.$transaction([prisma.chatMessage.create({data:{conversationId:session.id,role:"USER",message:value.message}}),prisma.chatSession.update({where:{id:session.id},data:{lastMessageAt:now}})]);
    const history=await prisma.chatMessage.findMany({where:{conversationId:session.id},orderBy:{createdAt:"desc"},take:20});const account=await buildAccountContext(user.id),instructions=systemInstructions(account),apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_SUPPORT_MODEL??"gpt-5-mini";
    const encoder=new TextEncoder(),sessionId=session.id;
    const stream=new ReadableStream({async start(controller){
      const send=(data:unknown)=>controller.enqueue(encoder.encode(line(data)));send({type:"session",session:{id:sessionId,title:session!.title}});
      let answer="";
      try{
        if(!apiKey)throw new Error("AI_NOT_CONFIGURED");
        const upstream=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:JSON.stringify({model,instructions,input:history.reverse().map(item=>({role:item.role==="ASSISTANT"?"assistant":"user",content:item.message})),stream:true,max_output_tokens:700})});
        if(!upstream.ok||!upstream.body)throw new Error("AI_UPSTREAM_FAILED");
        const reader=upstream.body.getReader(),decoder=new TextDecoder();let buffer="";
        while(true){const{done,value:chunk}=await reader.read();if(done)break;buffer+=decoder.decode(chunk,{stream:true});const events=buffer.split("\n\n");buffer=events.pop()??"";for(const event of events){for(const row of event.split("\n")){if(!row.startsWith("data: "))continue;const raw=row.slice(6);if(raw==="[DONE]")continue;try{const eventData=JSON.parse(raw) as {type?:string;delta?:string};if(eventData.type==="response.output_text.delta"&&eventData.delta){answer+=eventData.delta;send({type:"delta",delta:eventData.delta})}}catch{}}}}
        if(!answer.trim())throw new Error("AI_EMPTY_RESPONSE");
      }catch(error){answer=error instanceof Error&&error.message==="AI_NOT_CONFIGURED"?"AI Support is not configured right now. Please create a support ticket and the Bitvora team will help you.":"I couldn't complete that answer right now. Please try again or create a support ticket.";send({type:"delta",delta:answer});send({type:"escalate"});}
      const saved=await prisma.chatMessage.create({data:{conversationId:sessionId,role:"ASSISTANT",message:answer.slice(0,12000)}});await prisma.chatSession.update({where:{id:sessionId},data:{lastMessageAt:saved.createdAt}});send({type:"done",message:{id:saved.id,createdAt:saved.createdAt}});controller.close();
    }});
    return new Response(stream,{headers:{"content-type":"application/x-ndjson; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
  }catch(error){const message=error instanceof z.ZodError?error.issues[0]?.message??"Invalid message.":error instanceof Error&&error.message==="INVALID_ORIGIN"?"Invalid request origin.":"Unable to send message.";return new Response(line({type:"error",error:message}),{status:400,headers:{"content-type":"application/x-ndjson"}})}
}
