import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertMutationRequest, issueCsrfToken, SupportSecurityError } from "@/lib/support-security.server";

const userId="support-user-1",production="https://bitvora.zenithsoftech.com";
const original={secret:process.env.AUTH_SECRET,authUrl:process.env.AUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL,trust:process.env.SUPPORT_TRUST_PROXY};
const request=(headers:Record<string,string>={},url=`${production}/api/support/chat`)=>new Request(url,{method:"POST",headers:{"x-csrf-token":issueCsrfToken(userId),cookie:"__Secure-authjs.session-token=authenticated",...headers}});
const accepted=(value:Request)=>expect(()=>assertMutationRequest(value,userId)).not.toThrow();
const rejected=(value:Request,reason:string)=>expect(()=>assertMutationRequest(value,userId)).toThrowError(expect.objectContaining<Partial<SupportSecurityError>>({reason}));

describe("Support mutation request security",()=>{
  beforeEach(()=>{process.env.AUTH_SECRET="support-security-test-secret-with-32-characters";process.env.AUTH_URL=production;delete process.env.NEXTAUTH_URL;delete process.env.SUPPORT_TRUST_PROXY;vi.spyOn(console,"warn").mockImplementation(()=>{})});
  afterEach(()=>{for(const[key,value]of Object.entries(original)){const env={secret:"AUTH_SECRET",authUrl:"AUTH_URL",nextAuthUrl:"NEXTAUTH_URL",trust:"SUPPORT_TRUST_PROXY"}[key]!;if(value===undefined)delete process.env[env];else process.env[env]=value}vi.restoreAllMocks()});
  it("accepts a valid same-origin Origin",()=>accepted(request({origin:production,"sec-fetch-site":"same-origin","sec-fetch-mode":"cors","sec-fetch-dest":"empty"})));
  it("accepts a valid same-origin Referer",()=>accepted(request({referer:`${production}/support`,"sec-fetch-site":"same-origin"})));
  it("accepts a trusted HTTPS reverse proxy host",()=>{delete process.env.AUTH_URL;process.env.SUPPORT_TRUST_PROXY="true";accepted(request({origin:production,"x-forwarded-host":"bitvora.zenithsoftech.com","x-forwarded-proto":"https","sec-fetch-site":"same-origin"},"http://127.0.0.1:3000/api/support/chat"))});
  it("accepts Android-style same-site metadata with valid CSRF",()=>accepted(request({"sec-fetch-site":"same-site","sec-fetch-mode":"cors"})));
  it("accepts missing Origin with valid Referer and token",()=>accepted(request({referer:`${production}/support`})));
  it("rejects a cross-site Origin",()=>rejected(request({origin:"https://evil.example","sec-fetch-site":"cross-site"}),"INVALID_ORIGIN"));
  it("rejects cross-site Fetch Metadata",()=>rejected(request({origin:production,"sec-fetch-site":"cross-site"}),"INVALID_FETCH_SITE"));
  it("rejects an invalid CSRF token",()=>rejected(request({origin:production,"x-csrf-token":"invalid"}),"INVALID_CSRF_TOKEN"));
  it("rejects missing authentication when provenance headers are absent",()=>rejected(request({cookie:""}),"MISSING_AUTH_COOKIE"));
  it("normalizes internal HTTP to forwarded HTTPS",()=>{delete process.env.AUTH_URL;process.env.SUPPORT_TRUST_PROXY="true";accepted(request({origin:`${production}/`,"x-forwarded-host":"BITVORA.ZENITHSOFTECH.COM:443","x-forwarded-proto":"https"},"http://localhost:3000/api/support/chat"))});
  it("accepts the configured production domain",()=>accepted(request({origin:"https://BITVORA.ZENITHSOFTECH.COM/","sec-fetch-site":"same-origin"})));
});
