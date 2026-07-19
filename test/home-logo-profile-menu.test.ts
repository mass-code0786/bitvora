import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const shell = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
const brand = fs.readFileSync(path.join(process.cwd(), "components/brand.tsx"), "utf8");

describe("Home logo profile menu", () => {
  it("makes only the Home logo open the account sheet", () => {
    expect(shell).toContain('dashboard?<><div className="target-header-top"><Logo onClick={openProfile}/>');
    expect(shell).toContain('dashboard?');
    expect(shell).toContain(':<><Logo/>');
    expect(brand).toContain('aria-label="Open Bitvora account menu"');
  });

  it("loads authoritative KYC state and links to verification", () => {
    expect(shell).toContain('fetch("/api/kyc/me",{cache:"no-store"})');
    expect(shell).toContain('href="/profile/kyc"');
    expect(shell).toContain('kycStatus==="APPROVED"?"✓ Verified":"○ Not Verified"');
  });

  it("provides password validation and server submission", () => {
    expect(shell).toContain('fetch("/api/account/change-password"');
    expect(shell).toContain('newPassword!==confirmPassword');
    expect(shell).toContain('Current Password');
    expect(shell).toContain('Confirm New Password');
  });

  it("confirms logout, clears client caches, and invalidates the session", () => {
    expect(shell).toContain('Are you sure you want to logout?');
    expect(shell).toContain('localStorage.clear();sessionStorage.clear();await signOut({callbackUrl:"/login"})');
  });
});
