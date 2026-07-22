import { z } from "zod";
const positive=(fallback:number)=>z.coerce.number().int().positive().default(fallback);
const schema=z.object({SALARY_TIME_ZONE:z.string().default("Asia/Kolkata"),SALARY_QUEUE_CONCURRENCY:positive(20),SALARY_ENQUEUE_BATCH_SIZE:positive(500),SALARY_MAX_RETRIES:positive(8),REDIS_URL:z.string().default("redis://127.0.0.1:6379")});
export const salaryConfig=schema.parse(process.env);
export const salaryQueueName="salary-payment-v1";
export const salaryDeadLetterQueueName="salary-payment-dlq-v1";
