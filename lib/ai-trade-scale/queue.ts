import IORedis from "ioredis";
import { Queue } from "bullmq";
import { aiTradeScaleConfig,queues } from "./config";
export const redisConnection=new IORedis(aiTradeScaleConfig.REDIS_URL,{maxRetriesPerRequest:null,enableReadyCheck:true});
export const tradeQueue=new Queue(queues.trade,{connection:redisConnection});
export const settlementQueue=new Queue(queues.settlement,{connection:redisConnection});
export const outboxQueue=new Queue(queues.outbox,{connection:redisConnection});
export const deadLetterQueue=new Queue(queues.deadLetter,{connection:redisConnection});
export const jobOptions={attempts:aiTradeScaleConfig.AI_TRADE_MAX_RETRIES,backoff:{type:"exponential" as const,delay:1000},removeOnComplete:{age:86_400,count:100_000},removeOnFail:false};
