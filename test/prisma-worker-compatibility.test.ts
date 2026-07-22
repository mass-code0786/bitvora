import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source=readFileSync(resolve(process.cwd(),"lib/prisma.ts"),"utf8");
const worker=readFileSync(resolve(process.cwd(),"scripts/ai-bot-auto-trade-worker.ts"),"utf8");
const workerService=readFileSync(resolve(process.cwd(),"lib/ai-bot-auto-trade.server.ts"),"utf8");
const timezone=readFileSync(resolve(process.cwd(),"lib/timezone.server.ts"),"utf8");

describe("standalone worker Prisma compatibility",()=>{
  it("keeps the shared Prisma client free of Next.js-only server markers",()=>{expect(source).not.toContain('import "server-only"');expect(source).not.toContain("from \"server-only\"")});
  it("uses one process-wide Prisma client for routes and workers",()=>{expect(source).toContain("globalForPrisma.prisma ??= new PrismaClient()");expect(worker).toContain('from "@/lib/prisma"')});
  it("keeps the complete worker path free of the Next.js-only marker",()=>{expect(worker).not.toContain('import "server-only"');expect(workerService).not.toContain('import "server-only"');expect(timezone).not.toContain('import "server-only"')});
});
