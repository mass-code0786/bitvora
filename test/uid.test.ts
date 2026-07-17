import { describe, expect, it, vi } from "vitest";
import { generateUniqueUserUid } from "@/lib/auth/uid";

describe("generateUniqueUserUid", () => {
  it("retries a database collision", async () => {
    const findUnique = vi.fn().mockResolvedValueOnce({ id: "taken" }).mockResolvedValueOnce(null);
    const candidates = ["BV100001", "BV100002"];
    await expect(generateUniqueUserUid({ user: { findUnique } }, () => candidates.shift()!)).resolves.toBe("BV100002");
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
