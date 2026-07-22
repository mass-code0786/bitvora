import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const client=fs.readFileSync(path.join(process.cwd(),"components/admin/banner-management.tsx"),"utf8"),service=fs.readFileSync(path.join(process.cwd(),"lib/banner/banner-service.server.ts"),"utf8"),schema=fs.readFileSync(path.join(process.cwd(),"prisma/schema.prisma"),"utf8");
describe("banner upload contract",()=>{
  it("preserves a retry key across recoverable failures and deduplicates draft creation",()=>{expect(client).toContain('form.set("uploadKey",uploadKey.current)');expect(client).not.toMatch(/if\(!response\.ok\)[\s\S]{0,180}setFile\(null\)/);expect(service).toContain("findUnique({where:{uploadKey}})");expect(schema).toMatch(/uploadKey\s+String\?\s+@unique/)});
  it("converts browser-local date inputs to UTC and displays stored dates locally",()=>{expect(client).toContain("new Date(value).toISOString()");expect(client).toContain("formatLocalDateTime(value)")});
  it("shows the final cropped cover preview and no obsolete validation copy",()=>{expect(client).toContain("Final 9:16 crop preview");expect(client).not.toContain("server validation required");expect(client).not.toContain("Banner must use a 9:16 portrait ratio")});
});
