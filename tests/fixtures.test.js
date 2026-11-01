import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runChecks } from "../lib/checks/index.js";
import { CheckResult } from "../lib/checks/schema.js";
import { StoreSnapshot } from "../lib/crawl/schema.js";
import { scoreAudit } from "../lib/scoring/index.js";
import { productsSection } from "./fixtures/snapshot.js";
import { headlessStore, strongStore, weakStore } from "./fixtures/stores.js";

const stores = { strongStore, weakStore, headlessStore };
const audit = (snapshot) => scoreAudit(runChecks(snapshot));
const areaScores = (scores) =>
  Object.fromEntries(scores.areas.map((a) => [a.area, a.score]));

describe("fixture stores", () => {
  it.each(Object.entries(stores))(
    "%s is a valid snapshot with valid check results",
    (_, snapshot) => {
      expect(() => StoreSnapshot.parse(snapshot)).not.toThrow();
      expect(() =>
        z.array(CheckResult).parse(runChecks(snapshot)),
      ).not.toThrow();
    },
  );

  it("score a healthy store as Good", () => {
    const checks = runChecks(strongStore);
    expect(
      checks.filter((c) => c.area !== "performance").every((c) => c.passed),
    ).toBe(true);
    expect(audit(strongStore).overall).toEqual({
      score: 100,
      grade: "good",
      areasScored: 5,
    });
  });

  it("score a weak store as a big opportunity", () => {
    const scores = audit(weakStore);
    expect(areaScores(scores)).toEqual({
      copy: 0,
      search: 0,
      support: 20,
      recommendations: 0,
      email: 0,
    });
    expect(scores.overall).toEqual({
      score: 3,
      grade: "big_opportunity",
      areasScored: 5,
    });
  });

  it("don't score what a headless store hides", () => {
    const scores = audit(headlessStore);
    expect(areaScores(scores)).toEqual({
      copy: null,
      search: null,
      support: 50,
      recommendations: 0,
      email: 100,
    });
    // (50 × 15 + 0 × 20 + 100 × 20) / 55
    expect(scores.overall).toEqual({
      score: 50,
      grade: "big_opportunity",
      areasScored: 3,
    });
  });
});

describe("determinism", () => {
  it("gives identical results for the same snapshot", () => {
    for (const snapshot of Object.values(stores)) {
      expect(JSON.stringify(audit(snapshot))).toBe(
        JSON.stringify(audit(snapshot)),
      );
      expect(runChecks(structuredClone(snapshot))).toEqual(runChecks(snapshot));
    }
  });

  it("doesn't depend on the order products were crawled in", () => {
    const reversed = {
      ...weakStore,
      products: productsSection(
        [...weakStore.products.data.products].reverse(),
      ),
    };
    expect(runChecks(reversed)).toEqual(runChecks(weakStore));
  });
});
