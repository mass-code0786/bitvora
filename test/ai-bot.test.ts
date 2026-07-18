import { describe, expect, it } from "vitest";
import { AI_BOT_VALIDITY_MS, aiBotStatus } from "@/lib/ai-bot";
import { createDailySessions, createEmptyTradingStore, placeUserTrade } from "@/lib/ai-trading-engine";
import { cloneWalletSeed, creditSpotDeposit, purchaseAiBotFromSpot } from "@/lib/wallet-data";

describe("AI Bot subscriptions", () => {
  it("deducts the purchase price exactly once", () => {
    const funded = creditSpotDeposit(cloneWalletSeed(), { key: "deposit", userId: "user-1", amount: 25, title: "Test deposit", reference: "test-deposit", timestamp: 1 });
    const purchased = purchaseAiBotFromSpot(funded, { key: "purchase", userId: "user-1", amount: 10, timestamp: 2 });
    const retried = purchaseAiBotFromSpot(purchased, { key: "purchase", userId: "user-1", amount: 10, timestamp: 3 });

    expect(purchased.wallets.spot.balance).toBe(15);
    expect(retried.wallets.spot.balance).toBe(15);
    expect(retried.transactions.filter((item) => item.type === "AI_BOT_PURCHASE")).toHaveLength(1);
  });

  it("rejects a purchase with insufficient Spot Wallet funds", () => {
    expect(() => purchaseAiBotFromSpot(cloneWalletSeed(), { key: "purchase", userId: "user-1", amount: 10, timestamp: 1 })).toThrow(/Insufficient Spot Wallet/);
  });

  it("expires at the exact 30-day boundary", () => {
    const activatedAt = new Date("2026-07-18T12:00:00.000Z");
    const expiresAt = new Date(activatedAt.getTime() + AI_BOT_VALIDITY_MS);
    const subscription = { id: "bot-1", price: 10, activatedAt, expiresAt };

    expect(aiBotStatus(subscription, expiresAt.getTime() - 1).status).toBe("ACTIVE");
    expect(aiBotStatus(subscription, expiresAt.getTime()).status).toBe("EXPIRED");
  });

  it("records AI Bot placement and cannot duplicate a manual join", () => {
    const session = createDailySessions("2026-07-18", 0)[0];
    const bot = placeUserTrade({ store: createEmptyTradingStore(), session, userId: "user-1", userUid: "BV100001", futureBalance: 1000, now: session.liveFrom, placementSource: "AI_BOT" });
    const manualRetry = placeUserTrade({ store: bot.store, session, userId: "user-1", userUid: "BV100001", futureBalance: 1000, now: session.liveFrom, placementSource: "MANUAL" });

    expect(bot.trade.placementSource).toBe("AI_BOT");
    expect(manualRetry.created).toBe(false);
    expect(manualRetry.store.trades).toHaveLength(1);
    expect(manualRetry.trade.placementSource).toBe("AI_BOT");
  });
});
