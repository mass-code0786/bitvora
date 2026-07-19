import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("Home profile rank stars",()=>{
  it("renders seven dynamic stars from the server account rank",async()=>{const source=await readFile("components/app-shell.tsx","utf8");expect(source).toContain('fetch("/api/account/state",{cache:"no-store"})');expect(source).toContain("rankAccount?.currentStar");expect(source).toContain("Array.from({length:7}");expect(source).toContain('index<currentRank?"★":"☆"');expect(source).toContain('window.addEventListener("bitvora-wallet-updated",loadRank)')});
  it("uses gold achieved stars and white locked stars",async()=>{const css=await readFile("app/globals.css","utf8");expect(css).toContain(".target-rank-stars i{color:#fff");expect(css).toContain(".target-rank-stars i.achieved{color:#ffd700")});
});
