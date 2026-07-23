import { z } from "zod";
const integer=(fallback:number)=>z.coerce.number().int().positive().default(fallback);
const schema=z.object({REDIS_URL:z.string().default("redis://127.0.0.1:6379"),AI_TRADE_QUEUE_CONCURRENCY:integer(20),AI_TRADE_ENQUEUE_BATCH_SIZE:integer(500),AI_TRADE_SETTLEMENT_CONCURRENCY:integer(20),AI_TRADE_MAX_RETRIES:integer(8),AI_TRADE_SETTLEMENT_SLA_SECONDS:integer(120),AI_TRADE_CATCH_UP_HOURS:integer(12),AI_TRADE_ENQUEUE_TIMEOUT_MS:integer(5_000),AI_TRADE_API_TIMEOUT_MS:integer(8_000)});
export const aiTradeScaleConfig=schema.parse(process.env);
export const queues={trade:"ai-trade-create-v1",settlement:"ai-trade-settle-v1",outbox:"ai-trade-outbox-v1",deadLetter:"ai-trade-dlq-v1"} as const;
