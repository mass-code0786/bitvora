import { prisma } from "@/lib/prisma";
import { auditWithdrawals } from "@/lib/withdrawals/audit.server";
import { closeWithdrawalQueue } from "@/lib/withdrawals/queue.server";
const input=process.argv.find(v=>v.startsWith("--user="))?.slice(7);if(!input)throw new Error("Usage: npm run withdrawal:audit -- --user=<USER_ID_OR_EMAIL>");const selector:string=input;
async function main(){const user=await prisma.user.findFirst({where:{OR:[{id:selector},{uid:selector},{email:selector.toLowerCase()}]},select:{id:true}});if(!user)throw new Error("User not found.");console.log(JSON.stringify(await auditWithdrawals({userId:user.id}),null,2))}
main().finally(async()=>{await closeWithdrawalQueue();await prisma.$disconnect()});
