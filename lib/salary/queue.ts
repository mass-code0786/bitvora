import IORedis from "ioredis";
import { Queue } from "bullmq";
import { salaryConfig,salaryDeadLetterQueueName,salaryQueueName } from "./config";
let redis:IORedis|null=null,payments:Queue|null=null,deadLetters:Queue|null=null;
export const salaryRedisConnection=()=>redis??=new IORedis(salaryConfig.REDIS_URL,{maxRetriesPerRequest:null,enableReadyCheck:true});
export const getSalaryQueue=()=>payments??=new Queue(salaryQueueName,{connection:salaryRedisConnection()});
export const getSalaryDeadLetterQueue=()=>deadLetters??=new Queue(salaryDeadLetterQueueName,{connection:salaryRedisConnection()});
export const salaryJobOptions={attempts:salaryConfig.SALARY_MAX_RETRIES,backoff:{type:"exponential" as const,delay:1000},removeOnComplete:{age:86_400,count:100_000},removeOnFail:false};
