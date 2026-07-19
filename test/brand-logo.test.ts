import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("Bitvora brand logo",()=>{
  it("uses the existing Lucide Bitcoin icon while preserving Bitvora text",async()=>{const source=await readFile("components/brand.tsx","utf8");expect(source).toContain('import { Bitcoin } from "lucide-react"');expect(source).toContain("<Bitcoin");expect(source).toContain(">Bitvora</span>");expect(source).not.toContain('<span className="logo-mark"><span>B</span>')});
  it("applies the premium Bitcoin gold palette",async()=>{const css=(await readFile("app/globals.css","utf8")).toLowerCase();expect(css).toContain("#f7931a");expect(css).toContain("#ffb000");expect(css).toContain(".logo-mark>svg")});
});
