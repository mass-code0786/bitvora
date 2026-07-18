import { describe, expect, it } from "vitest";
import { calculatePortfolioGrowth } from "@/lib/portfolio-growth";

describe("portfolio growth",()=>{
  it("renders an unchanged baseline as zero",()=>expect(calculatePortfolioGrowth(98,98)).toBe(0));
  it("calculates positive growth",()=>expect(calculatePortfolioGrowth(98,80)).toBe(22.5));
  it("calculates negative growth",()=>expect(calculatePortfolioGrowth(91.8,100)).toBe(-8.2));
  it("handles an empty portfolio",()=>expect(calculatePortfolioGrowth(0,0)).toBe(0));
  it("uses the consistent first-funding rule without dividing by zero",()=>expect(calculatePortfolioGrowth(10,0)).toBe(100));
});
