import IORedis from "ioredis";
import { Queue } from "bullmq";
import { aiTradeScaleConfig,queues } from "./config";
let connection:IORedis|undefined;
const instances=new Map<string,Queue>();
export function getRedisConnection(){return connection??=new IORedis(aiTradeScaleConfig.REDIS_URL,{maxRetriesPerRequest:null,enableReadyCheck:true})}
const queue=(name:string)=>{let value=instances.get(name);if(!value){value=new Queue(name,{connection:getRedisConnection()});instances.set(name,value)}return value};
export const getTradeQueue=()=>queue(queues.trade);
export const getSettlementQueue=()=>queue(queues.settlement);
export const getDeadLetterQueue=()=>queue(queues.deadLetter);
export const settlementQueue={add:(name:string,data:Record<string,unknown>,options:Record<string,unknown>)=>getSettlementQueue().add(name,data,options)};
export const deadLetterQueue={add:(name:string,data:Record<string,unknown>,options:Record<string,unknown>)=>getDeadLetterQueue().add(name,data,options)};
export async function closeAiTradeQueues(){await Promise.all([...instances.values()].map(value=>value.close()));instances.clear();if(connection){await connection.quit();connection=undefined}}
export const jobOptions={attempts:aiTradeScaleConfig.AI_TRADE_MAX_RETRIES,backoff:{type:"exponential" as const,delay:1000},removeOnComplete:{age:86_400,count:100_000},removeOnFail:false};
