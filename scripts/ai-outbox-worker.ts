import "dotenv/config";
import { prisma } from "@/lib/prisma";
let active=false;
async function cycle(){
  if(active)return; active=true;
  try{
    const events=await prisma.$transaction(async tx=>{
      const ids=await tx.$queryRaw<{id:string}[]>`SELECT "id" FROM "AiOutboxEvent" WHERE "status"='PENDING' AND "availableAt"<=NOW() ORDER BY "id" LIMIT 100 FOR UPDATE SKIP LOCKED`;
      if(!ids.length)return [];
      return Promise.all(ids.map(({id})=>tx.aiOutboxEvent.update({where:{id},data:{status:"PROCESSING",lockedAt:new Date(),attempts:{increment:1}}})));
    });
    for(const event of events){
      try{
        const payload=event.payload as {tradeId?:string;amount?:string};
        await prisma.$transaction(async tx=>{
          const salary=event.eventType==="SALARY_CREDITED",rank=(event.payload as {rank?:number}).rank;
          await tx.userNotification.upsert({where:{reference:event.idempotencyKey},create:{userId:event.userId,reference:event.idempotencyKey,type:event.eventType,title:salary?"Salary Credited":event.eventType==="TRADE_STARTED"?"Trade placed":event.eventType==="TRADE_SETTLED"?"Trade settled":"Profit credited",message:salary?`Your ${rank} Star salary of $${payload.amount} has been credited to your Spot Wallet.`:event.eventType==="PROFIT_CREDITED"?`${payload.amount} profit was credited.`:`AI trade ${payload.tradeId??event.aggregateId}`},update:{}});
          await tx.aiOutboxEvent.update({where:{id:event.id},data:{status:"SENT",sentAt:new Date()}});
        });
      }catch(error){
        await prisma.aiOutboxEvent.update({where:{id:event.id},data:{status:event.attempts>=8?"DEAD":"PENDING",availableAt:new Date(Date.now()+Math.min(60_000,2**event.attempts*1000)),lastError:(error instanceof Error?error.message:"unknown").slice(0,500)}});
      }
    }
  }finally{active=false}
}
void cycle();const timer=setInterval(()=>void cycle(),500);
async function stop(){clearInterval(timer);await prisma.$disconnect();process.exit(0)}
process.on("SIGTERM",()=>void stop());process.on("SIGINT",()=>void stop());
