import { describe, expect, it } from "vitest";
import { ungroundedNumbers } from "../../lib/llm/grounding.js";

describe("ungroundedNumbers", () => {
  it("accepts figures repeated from the facts", () => {
    const facts = JSON.stringify({
      evidence: "495 of 1,000 products (49.5%)",
      price: 24,
    });
    expect(
      ungroundedNumbers("495 of 1,000 products (49.5%) cost $24.00", facts),
    ).toEqual([]);
  });

  it("flags rounded or invented figures", () => {
    expect(
      ungroundedNumbers("About 50% of 1000 products", "49.5% of 1,000"),
    ).toEqual([50]);
  });

  it("matches numbers by value, not formatting", () => {
    expect(ungroundedNumbers("1000 products", "1,000 products")).toEqual([]);
  });

  it("has nothing to flag in text without numbers", () => {
    expect(ungroundedNumbers("About half of your products", "")).toEqual([]);
  });
});
