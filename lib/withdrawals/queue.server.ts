import IORedis from "ioredis";
import { Queue } from "bullmq";
import { withdrawalConfig } from "./config.server";
let connection:IORedis|undefined,queue:Queue|undefined;
export const withdrawalQueueName="bitvora-withdrawal-payout";
export const withdrawalBullJobId=(withdrawalId:string)=>`withdrawal-payout__${withdrawalId}`;
export const withdrawalJobOptions={attempts:1,removeOnComplete:{age:86400,count:10000},removeOnFail:false};
export function getWithdrawalRedis(){return connection??=new IORedis(withdrawalConfig().REDIS_URL,{maxRetriesPerRequest:null,enableReadyCheck:true})}
export function getWithdrawalQueue(){return queue??=new Queue(withdrawalQueueName,{connection:getWithdrawalRedis()})}
export async function enqueueWithdrawalJob(job:{id:string;withdrawalId:string;bullJobId:string}){
  const result=await getWithdrawalQueue().add("process-withdrawal",{dbJobId:job.id,withdrawalId:job.withdrawalId},{...withdrawalJobOptions,jobId:job.bullJobId});
  return result.id;
}
export async function closeWithdrawalQueue(){if(queue)await queue.close();if(connection)await connection.quit();queue=undefined;connection=undefined}

