import { prisma } from "@/lib/prisma";
import { withdrawalConfig } from "./config.server";
const HEARTBEAT_MAX_AGE_MS=120_000;
export const signerHeartbeatAvailable=(state:{signerAvailable:boolean;workerHeartbeatAt:Date|null}|null,now=new Date())=>Boolean(state?.signerAvailable&&state.workerHeartbeatAt&&now.getTime()-state.workerHeartbeatAt.getTime()<=HEARTBEAT_MAX_AGE_MS);
export async function automaticWithdrawalAvailable(now=new Date()){if(withdrawalConfig().WITHDRAWAL_AUTOMATION_ENABLED!=="true")return false;return signerHeartbeatAvailable(await prisma.withdrawalSystemState.findUnique({where:{id:"default"}}),now)}
export async function recordSignerHeartbeat(address:string){return prisma.withdrawalSystemState.upsert({where:{id:"default"},create:{signerAvailable:true,signerAddress:address,workerHeartbeatAt:new Date()},update:{signerAvailable:true,signerAddress:address,workerHeartbeatAt:new Date()}})}
export async function clearSignerHeartbeat(){return prisma.withdrawalSystemState.upsert({where:{id:"default"},create:{signerAvailable:false},update:{signerAvailable:false,workerHeartbeatAt:null}})}
