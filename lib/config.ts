export const tradingPlan = {
  startPlan: 10,
  workingPlan: 50,
  profitRange: [1, 2] as const,
  durationMinutes: 30,
  regularTradesPerDay: 1,
  extraTradesPerDay: 1,
  extraTradeDays: 10,
  fundUnlockDays: 45,
  targetMultiple: 2,
  targetDays: 50,
};

export const referralPlan = {
  eligiblePlan: 50,
  directIncomePercent: 5,
  levelIncomePercent: 1,
  levels: 5,
};

export const ranks = [
  { star: 1, team: 5, reward: 30, salary: 10, qualification: "Build a team of 5", directStars: { count: 0, star: 0 } },
  { star: 2, team: 25, reward: 60, salary: 30, qualification: "3 direct members at 1st Star", directStars: { count: 3, star: 1 } },
  { star: 3, team: 125, reward: 150, salary: 100, qualification: "3 direct members at 2nd Star", directStars: { count: 3, star: 2 } },
  { star: 4, team: 625, reward: 300, salary: 250, qualification: "2 direct members at 3rd Star", directStars: { count: 2, star: 3 } },
  { star: 5, team: 2500, reward: 600, salary: 500, qualification: "2 direct members at 4th Star", directStars: { count: 2, star: 4 } },
  { star: 6, team: 5000, reward: 1500, salary: 1000, qualification: "2 direct members at 5th Star", directStars: { count: 2, star: 5 } },
  { star: 7, team: 10000, reward: 3000, salary: 2000, qualification: "2 direct members at 6th Star", directStars: { count: 2, star: 6 } },
] as const;

export const salaryPlan = {
  frequencyLabel: "Twice monthly",
  paymentDays: [1, 15] as const,
  cyclesPerYear: 24,
};

export const appConfig = { tradingPlan, referralPlan, ranks, salaryPlan };
