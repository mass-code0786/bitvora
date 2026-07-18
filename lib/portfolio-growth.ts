export function calculatePortfolioGrowth(currentTotal:number,baselineTotal:number){
  const currentCents=Math.round(currentTotal*100),baselineCents=Math.round(baselineTotal*100);
  if(baselineCents===0)return currentCents===0?0:100;
  return Number((((currentCents-baselineCents)/baselineCents)*100).toFixed(2));
}
