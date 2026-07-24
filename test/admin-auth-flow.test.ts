import { beforeEach,describe,expect,it,vi } from "vitest";
import { readFileSync } from "node:fs";
import { AdminAuthorizationError } from "@/lib/auth/admin-authorization";

const mocks=vi.hoisted(()=>({
  requireDemoAdmin:vi.fn(),
  userFindMany:vi.fn(),
  tradeFindMany:vi.fn(),
}));
vi.mock("@/lib/admin/admin-auth.server",()=>({requireDemoAdmin:mocks.requireDemoAdmin}));
vi.mock("@/lib/prisma",()=>({prisma:{
  user:{findMany:mocks.userFindMany},
  aiFinancialTrade:{findMany:mocks.tradeFindMany},
}}));

import { GET } from "@/app/api/admin/snapshot/route";

const request=()=>new Request("https://bitvora.zenithsoftech.com/api/admin/snapshot",{
  headers:{cookie:"authjs.session-token=redacted; __Secure-authjs.session-token=redacted"},
});

describe("production admin authentication flow",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.userFindMany.mockResolvedValue([]);
    mocks.tradeFindMany.mockResolvedValue([]);
  });

  it("returns 401 when signed out",async()=>{
    mocks.requireDemoAdmin.mockRejectedValue(new AdminAuthorizationError("NO_SESSION",401));
    const response=await GET(request());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({code:"NO_SESSION"});
  });

  it("returns 403 for an authenticated normal user",async()=>{
    mocks.requireDemoAdmin.mockRejectedValue(new AdminAuthorizationError("ADMIN_ROLE_REQUIRED",403));
    const response=await GET(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({code:"ADMIN_ROLE_REQUIRED"});
  });

  it("returns a valid 200 snapshot for an admin session",async()=>{
    mocks.requireDemoAdmin.mockResolvedValue({id:"admin",uid:"BV100001",email:"admin@example.com",role:"ADMIN"});
    const response=await GET(request()),body=await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({users:[],trades:[],withdrawals:[],metrics:{}});
    expect(body.wallet).toBeTruthy();
  });

  it("shows session-expired and forbidden states separately",()=>{
    const hook=readFileSync("hooks/use-admin-data.ts","utf8"),page=readFileSync("components/admin/admin-page.tsx","utf8");
    expect(hook).toContain('response.status===401');
    expect(hook).toContain('"session-expired"');
    expect(hook).toContain('response.status===403');
    expect(page).toContain("Session expired. Sign in again.");
    expect(page).toContain("Administrator access required.");
  });

  it("sends credentials for browser admin requests",()=>{
    for(const file of ["hooks/use-admin-data.ts","app/admin/login/page.tsx"])expect(readFileSync(file,"utf8")).toContain('credentials:"same-origin"');
  });

  it("uses Auth.js database sessions for login, layout, and API",()=>{
    const auth=readFileSync("auth.ts","utf8"),login=readFileSync("app/admin/login/page.tsx","utf8"),guard=readFileSync("lib/admin/admin-auth.server.ts","utf8"),route=readFileSync("app/api/admin/snapshot/route.ts","utf8");
    expect(auth).toContain("PrismaAdapter");
    expect(auth).toContain("strategy: authStrategy");
    expect(login).toContain('signIn("credentials"');
    expect(guard).toContain("requireAdminUser");
    expect(route).toContain("requireDemoAdmin");
  });

  it("cannot authorize from client-only or localStorage state",()=>{
    const route=readFileSync("app/api/admin/snapshot/route.ts","utf8"),guard=readFileSync("lib/admin/admin-auth.server.ts","utf8");
    expect(route).not.toMatch(/localStorage|sessionStorage|NEXT_PUBLIC_BACKEND_AUTH_ENABLED/);
    expect(guard).not.toMatch(/localStorage|sessionStorage|demo.*password/i);
  });

  it("uses a secure host-scoped production cookie on the HTTPS custom domain",async()=>{
    vi.resetModules();
    vi.stubEnv("NODE_ENV","production");
    vi.stubEnv("AUTH_URL","https://bitvora.zenithsoftech.com");
    const config=await import("@/lib/auth/config");
    expect(config.sessionCookieName).toBe("__Secure-authjs.session-token");
    expect(config.sessionCookieOptions).toMatchObject({httpOnly:true,secure:true,sameSite:"lax",path:"/"});
    expect(config.sessionCookieOptions).not.toHaveProperty("domain");
    vi.unstubAllEnvs();
  });
});
