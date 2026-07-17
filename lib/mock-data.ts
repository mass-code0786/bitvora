
export const DEMO_SESSION_KEY = "bitvora-demo-session";

export const demoAccount = {
  email: "demo@bitvora.com", password: "Demo@123", name: "Alex Morgan", initials: "AM", userId: "BV100001",
  totalBalance: 15475, availableBalance: 12850, futureWallet: 2625, copyTradingWallet: 2625, totalProfit: 1248.5,
  currentRank: "2nd Star", nextRank: "3rd Star", directTeam: 12, totalTeam: 86, nextRankTeam: 125,
  regularTradesPerDay: 1, extraTradeActive: true, extraTradeDaysRemaining: 8,
  profitRange: "1% to 2%", tradeDurationMinutes: 30,
} as const;

export const coins = [
  { symbol: "BTC", name: "Bitcoin", price: 67482.1, change: "+2.84%", volume: 38200000000, color: "#58a6ff", chart: [42, 50, 45, 61, 56, 70, 77] },
  { symbol: "ETH", name: "Ethereum", price: 3528.42, change: "+1.62%", volume: 18700000000, color: "#3b8cff", chart: [48, 44, 55, 52, 65, 61, 73] },
  { symbol: "BNB", name: "BNB", price: 601.24, change: "+0.78%", volume: 2100000000, color: "#2879eb", chart: [38, 52, 48, 58, 55, 62, 66] },
  { symbol: "SOL", name: "Solana", price: 148.9, change: "+4.20%", volume: 4800000000, color: "#6ab2ff", chart: [32, 43, 39, 56, 51, 68, 80] },
  { symbol: "XRP", name: "XRP", price: 0.5218, change: "+1.11%", volume: 1300000000, color: "#83bfff", chart: [45, 40, 47, 51, 49, 58, 62] },
  { symbol: "TRX", name: "TRON", price: 0.1184, change: "+0.42%", volume: 682000000, color: "#196fdb", chart: [41, 44, 43, 49, 52, 51, 56] },
];

export const transactions = [
  { title: "AI trading profit", date: "Today, 10:32 AM", amount: 8.42, type: "Trade" },
  { title: "Wallet deposit", date: "Yesterday, 6:18 PM", amount: 500, type: "Deposit" },
  { title: "Level income", date: "Jul 14, 2:06 PM", amount: 20, type: "Reward" },
  { title: "Wallet transfer", date: "Jul 12, 9:41 AM", amount: -75, type: "Transfer" },
];

export const earnings = [
  { day: "Mon", value: 8 }, { day: "Tue", value: 13 }, { day: "Wed", value: 11 },
  { day: "Thu", value: 18 }, { day: "Fri", value: 21 }, { day: "Sat", value: 26 }, { day: "Sun", value: 31 },
];

export const teamMembers = [
  { name: "Maya Chen", rank: "2nd Star", volume: 1250, status: "Active" },
  { name: "Noah Williams", rank: "1st Star", volume: 680, status: "Active" },
  { name: "Aria Patel", rank: "Member", volume: 250, status: "Active" },
  { name: "Leo Martin", rank: "Member", volume: 50, status: "Pending" },
];
