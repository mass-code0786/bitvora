import { z } from "zod";
import { prisma } from "../lib/prisma";

async function main(){
  const email=z.string().email().parse(process.env.ADMIN_BOOTSTRAP_EMAIL).trim().toLowerCase();
  const existing=await prisma.user.findUnique({where:{email},select:{id:true,email:true,role:true}});
  if(!existing)throw new Error("ADMIN_BOOTSTRAP_USER_NOT_FOUND: register the user before assigning admin access");
  if(existing.role!=="ADMIN")await prisma.user.update({where:{id:existing.id},data:{role:"ADMIN"}});
  console.info(JSON.stringify({event:"admin.bootstrap.completed",userId:existing.id,email}));
}
main().finally(()=>prisma.$disconnect());
