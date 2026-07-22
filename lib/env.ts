import "server-only";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  INTERNAL_JOB_SECRET: z.string().min(32),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  NOWPAYMENTS_API_KEY: z.string().min(1),
  NOWPAYMENTS_IPN_SECRET: z.string().min(32),
  NOWPAYMENTS_API_URL: z.string().url().default("https://api.nowpayments.io/v1"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  KYC_STORAGE_PROVIDER: z.enum(["S3", "R2", "S3_COMPATIBLE"]),
  KYC_STORAGE_BUCKET: z.string().min(1),
  KYC_STORAGE_REGION: z.string().min(1),
  KYC_STORAGE_ENDPOINT: z.string().url().optional(),
  KYC_STORAGE_ACCESS_KEY: z.string().min(1),
  KYC_STORAGE_SECRET_KEY: z.string().min(1),
  KYC_STORAGE_ENCRYPTION_KEY: z.string().min(32),
  MARKET_DATA_PROVIDER: z.literal("BINANCE"),
  MARKET_DATA_API_KEY: z.string().optional(),
  BUSINESS_TIMEZONE: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
});

export function validateServerEnvironment() {
  return serverEnvironmentSchema.parse(process.env);
}
