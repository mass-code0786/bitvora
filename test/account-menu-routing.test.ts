import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Account Menu routing",()=>{
  const shell=readFileSync("components/app-shell.tsx","utf8");
  it.each([["Profile","/profile"],["KYC Verification","/kyc"],["Transaction History","/transactions"],["Settings","/settings"],["Support","/support"]])("routes %s to its dedicated page",(label,href)=>{expect(shell).toContain(`href:"${href}",label:"${label}"`)});
  it("closes the sheet when a route is selected",()=>{expect(shell).toContain('onClick={()=>setMenuOpen(false)}')});
  it("keeps logout as an action",()=>{expect(shell).toContain('className="sheet-logout"')});
});
