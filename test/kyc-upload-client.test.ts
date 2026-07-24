import { readFile } from "node:fs/promises";
import { describe,expect,it,vi } from "vitest";
import { uploadKycForm,validateKycUploadFiles } from "@/lib/kyc/kyc-upload-client";
import { MAX_KYC_FILE_SIZE } from "@/lib/kyc/kyc-validation";

const mobile=(name:string,type="image/jpeg",size=2*1024*1024)=>new File([new Uint8Array(size)],name,{type});
const files=()=>({front:mobile("front.jpg"),back:mobile("back.jpg"),selfie:mobile("selfie.jpg")});
const json=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});

describe("KYC upload client",()=>{
  it("accepts three representative mobile images",()=>expect(()=>validateKycUploadFiles("NATIONAL_ID",files())).not.toThrow());
  it("accepts a passport with front and selfie only",()=>expect(()=>validateKycUploadFiles("PASSPORT",{...files(),back:null})).not.toThrow());
  it("requires a National ID back image",()=>expect(()=>validateKycUploadFiles("NATIONAL_ID",{...files(),back:null})).toThrow(/Back image is required/));
  it("rejects an oversized image before upload",()=>expect(()=>validateKycUploadFiles("PASSPORT",{...files(),back:null,front:mobile("large.jpg","image/jpeg",MAX_KYC_FILE_SIZE+1)})).toThrow(/8 MB/));
  it("rejects unsupported MIME before upload",()=>expect(()=>validateKycUploadFiles("PASSPORT",{...files(),back:null,front:mobile("front.gif","image/gif")})).toThrow(/JPEG, PNG, or WEBP/));
  it.each([401,403,413,500])("surfaces HTTP %s and consumes a JSON error",async status=>{
    await expect(uploadKycForm(new FormData(),{fetcher:vi.fn(async()=>json(status,{error:`safe ${status}`,code:`E_${status}`})) as typeof fetch})).rejects.toMatchObject({status,code:`E_${status}`,message:`safe ${status}`});
  });
  it("handles a non-JSON proxy 413 response",async()=>{
    const fetcher=vi.fn(async()=>new Response("<html>Request Entity Too Large</html>",{status:413})) as typeof fetch;
    await expect(uploadKycForm(new FormData(),{fetcher})).rejects.toMatchObject({status:413,code:"HTTP_413"});
  });
  it("times out and aborts the request",async()=>{
    const fetcher=vi.fn((_:RequestInfo|URL,init?:RequestInit)=>new Promise<Response>((_,reject)=>init?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError"))))) as typeof fetch;
    await expect(uploadKycForm(new FormData(),{fetcher,timeoutMs:5})).rejects.toMatchObject({code:"UPLOAD_TIMEOUT"});
  });
  it("returns the pending-review response on success",async()=>{
    await expect(uploadKycForm(new FormData(),{fetcher:vi.fn(async()=>json(200,{status:"PENDING",submissionVersion:1})) as typeof fetch})).resolves.toMatchObject({status:"PENDING"});
  });
  it("maps network failures without hiding their category",async()=>{
    await expect(uploadKycForm(new FormData(),{fetcher:vi.fn(async()=>{throw new TypeError("fetch failed")}) as typeof fetch})).rejects.toMatchObject({code:"NETWORK_ERROR"});
  });
  it("guards duplicate clicks and always clears loading in finally",async()=>{
    const source=await readFile("components/kyc-module.tsx","utf8");
    expect(source).toContain("if(submitting.current)return");
    expect(source).toContain("finally{submitting.current=false;setSending(false)}");
    expect(source).not.toContain('"content-type":"multipart/form-data"');
  });
});
