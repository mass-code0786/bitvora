import { describe,expect,it,vi } from "vitest";
import { isPostgresSerializationFailure,withPostgresSerializationRetry } from "@/lib/ai-trade-scale/serialization-retry";

const serializationError=()=>Object.assign(new Error("query failed"),{code:"P2010",meta:{code:"40001"}});

describe("AI trade PostgreSQL serialization retry",()=>{
  it("retries SQLSTATE 40001 with exponential backoff and jitter",async()=>{
    const operation=vi.fn().mockRejectedValueOnce(serializationError()).mockRejectedValueOnce(serializationError()).mockResolvedValue("committed"),sleep=vi.fn(async(_delayMs:number)=>undefined);
    await expect(withPostgresSerializationRetry(operation,{baseDelayMs:50,random:()=>0.5,sleep})).resolves.toBe("committed");
    expect(operation).toHaveBeenCalledTimes(3);expect(sleep.mock.calls.map(([delay])=>delay)).toEqual([75,150]);
  });
  it("stops after five retries",async()=>{
    const error=serializationError(),operation=vi.fn(async()=>{throw error}),sleep=vi.fn(async(_delayMs:number)=>undefined);
    await expect(withPostgresSerializationRetry(operation,{random:()=>0,sleep})).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(6);expect(sleep).toHaveBeenCalledTimes(5);
  });
  it("never retries another Prisma or PostgreSQL error",async()=>{
    for(const error of [Object.assign(new Error("unique"),{code:"P2002"}),Object.assign(new Error("deadlock"),{code:"P2010",meta:{code:"40P01"}})]){
      const operation=vi.fn(async()=>{throw error}),sleep=vi.fn(async(_delayMs:number)=>undefined);
      await expect(withPostgresSerializationRetry(operation,{sleep})).rejects.toBe(error);
      expect(operation).toHaveBeenCalledOnce();expect(sleep).not.toHaveBeenCalled();
    }
  });
  it("recognizes only structured SQLSTATE 40001 metadata",()=>{
    expect(isPostgresSerializationFailure(serializationError())).toBe(true);
    expect(isPostgresSerializationFailure(new Error("40001 could not serialize access"))).toBe(false);
  });
  it("preserves one financial result under concurrent retrying execution",async()=>{
    const committed=new Map<string,string>(),attempts=new Map<string,number>();
    const execute=(key:string)=>withPostgresSerializationRetry(async()=>{
      const attempt=(attempts.get(key)??0)+1;attempts.set(key,attempt);
      if(attempt<=2)throw serializationError();
      if(!committed.has(key))committed.set(key,crypto.randomUUID());
      return committed.get(key)!;
    },{random:()=>0,sleep:async()=>undefined});
    const results=await Promise.all([execute("AI_TRADE:user:date:slot:type"),execute("AI_TRADE:user:date:slot:type")]);
    expect(new Set(results).size).toBe(1);expect(committed.size).toBe(1);
  });
});
