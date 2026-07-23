import { z } from "zod";

const positive=(fallback:number)=>z.coerce.number().positive().default(fallback);
const nonnegative=(fallback:number)=>z.coerce.number().nonnegative().default(fallback);
const schema=z.object({
  REDIS_URL:z.string().default("redis://127.0.0.1:6379"),
  WITHDRAWAL_NETWORK:z.literal("USDT_BEP20").default("USDT_BEP20"),
  WITHDRAWAL_CHAIN_ID:z.coerce.number().int().positive().default(56),
  WITHDRAWAL_TOKEN_CONTRACT:z.string().default(""),
  WITHDRAWAL_TOKEN_DECIMALS:z.coerce.number().int().min(0).max(36).default(18),
  WITHDRAWAL_REQUIRED_CONFIRMATIONS:z.coerce.number().int().positive().default(12),
  AUTO_WITHDRAW_MIN_AMOUNT:positive(10),
  AUTO_WITHDRAW_MAX_PER_TX:positive(500),
  AUTO_WITHDRAW_MAX_PER_USER_DAILY:positive(1000),
  AUTO_WITHDRAW_MAX_GLOBAL_DAILY:positive(10000),
  WITHDRAWAL_RAPID_REQUEST_WINDOW_SECONDS:z.coerce.number().int().positive().default(60),
  WITHDRAWAL_MAX_ATTEMPTS:z.coerce.number().int().min(1).max(20).default(5),
  WITHDRAWAL_WORKER_CONCURRENCY:z.coerce.number().int().min(1).max(50).default(1),
  WITHDRAWAL_AUTOMATION_ENABLED:z.enum(["true","false"]).default("false"),
  WITHDRAWAL_RPC_URL:z.string().optional(),
  WITHDRAWAL_SIGNER_TYPE:z.enum(["KMS","KEYSTORE","ENV_PRIVATE_KEY"]).default("KEYSTORE"),
  WITHDRAWAL_KEYSTORE_PATH:z.string().optional(),
  WITHDRAWAL_KEYSTORE_PASSWORD:z.string().optional(),
  WITHDRAWAL_PRIVATE_KEY:z.string().optional(),
  WITHDRAWAL_BLOCKED_ADDRESSES:z.string().default(""),
  WITHDRAWAL_NATIVE_GAS_RESERVE_WEI:z.coerce.bigint().default(BigInt(0)),
  WITHDRAWAL_CONFIRMATION_POLL_MS:z.coerce.number().int().positive().default(15000),
  WITHDRAWAL_NETWORK_FEE_USDT:nonnegative(0)
});
export const withdrawalConfig=()=>schema.parse(process.env);
export const blockedAddresses=()=>new Set(withdrawalConfig().WITHDRAWAL_BLOCKED_ADDRESSES.split(",").map(v=>v.trim().toLowerCase()).filter(Boolean));
