import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDemoAdmin } from "@/lib/admin/admin-auth.server";
import { prisma } from "@/lib/prisma";
import { getSalaryQueue,salaryJobOptions } from "@/lib/salary/queue";
import { finalizeSalaryCycle } from "@/lib/salary/service";
export async function GET(request:Request){
  try{
    await requireDemoAdmin();
    const id=new URL(request.url).searchParams.get("cycleId");
    if(id){
      const cycle=await prisma.salaryCycle.findUnique({where:{id},include:{payments:{include:{user:{select:{uid:true,name:true}},ledger:true},orderBy:{createdAt:"asc"}}}});
      return cycle?NextResponse.json(cycle):NextResponse.json({error:"Cycle not found."},{status:404});
    }
    const cycles=await prisma.salaryCycle.findMany({orderBy:{scheduledAt:"desc"},take:50});
    return NextResponse.json(cycles,{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Forbidden"},{status:403})}
}
export async function POST(request:Request){try{await requireDemoAdmin();const value=z.object({action:z.enum(["RETRY","RECONCILE"]),paymentId:z.string().optional(),cycleId:z.string()}).parse(await request.json()),queue=getSalaryQueue();if(value.action==="RETRY"){if(!value.paymentId)throw new Error("Payment required");const payment=await prisma.salaryPayment.findUniqueOrThrow({where:{id:value.paymentId}});if(payment.paymentStatus==="PAID")return NextResponse.json({message:"Payment is already paid."});await prisma.salaryPayment.update({where:{id:payment.id},data:{paymentStatus:"PENDING",failureCode:null}});await queue.add("pay-salary",{paymentId:payment.id,cycleId:value.cycleId},{...salaryJobOptions,jobId:`SALARY_RETRY:${payment.id}:${Date.now()}`});return NextResponse.json({message:"Payment queued safely."})}const repairable=await prisma.salaryPayment.findMany({where:{salaryCycleId:value.cycleId,eligibilityStatus:"ELIGIBLE",paymentStatus:{in:["PENDING","FAILED"]}},select:{id:true,userId:true}});for(const payment of repairable)await queue.add("pay-salary",{paymentId:payment.id,cycleId:value.cycleId},{...salaryJobOptions,jobId:`SALARY_RECONCILE:${payment.id}:${Date.now()}`});const cycle=await finalizeSalaryCycle(value.cycleId);return NextResponse.json({message:`Cycle reconciled; ${repairable.length} payment(s) queued.`,cycle})}catch{return NextResponse.json({error:"Salary action failed."},{status:400})}}
