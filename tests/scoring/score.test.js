import { describe, expect, it } from "vitest";
import { AREAS, CHECKS } from "../../lib/checks/index.js";
import { sum } from "../../lib/checks/format.js";
import {
  AREA_WEIGHTS,
  CHECK_FIXES,
  FIXES,
  CHECK_WEIGHTS,
  gradeFor,
  scoreAudit,
} from "../../lib/scoring/index.js";

// Minimal check results for one area: every check passes unless overridden.
const area = (name, overrides = {}) =>
  CHECKS.filter((c) => c.area === name).map((c) => ({
    id: c.id,
    area: name,
    passed: c.id in overrides ? overrides[c.id] : true,
  }));
const areaScore = (scores, name) => scores.areas.find((a) => a.area === name);

describe("weights", () => {
  it("add up to 100 within each area and across areas", () => {
    for (const name of AREAS) {
      expect(sum(area(name).map((c) => CHECK_WEIGHTS[c.id]))).toBe(100);
    }
    expect(sum(Object.values(AREA_WEIGHTS))).toBe(100);
  });

  it("exist for every scored check, and so does a fix", () => {
    const scored = CHECKS.filter((c) => c.area !== "performance")
      .map((c) => c.id)
      .sort();
    expect(Object.keys(CHECK_WEIGHTS).sort()).toEqual(scored);
    expect(Object.keys(CHECK_FIXES).sort()).toEqual(scored);
    for (const { fix } of Object.values(CHECK_FIXES))
      expect(FIXES).toHaveProperty(fix);
  });

  it("belong to unique check ids", () => {
    const ids = CHECKS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("scoreAudit", () => {
  it("subtracts each failed check's weight from 100", () => {
    const scores = scoreAudit(
      area("copy", { "copy.thin-descriptions": false, "copy.seo-meta": false }),
    );
    expect(areaScore(scores, "copy")).toMatchObject({
      score: 55,
      grade: "big_opportunity",
      passed: 3,
      failed: 2,
      coverage: 1,
      deductions: [
        { checkId: "copy.thin-descriptions", weight: 30 },
        { checkId: "copy.seo-meta", weight: 15 },
      ],
    });
  });

  it("scales over the measured checks when some couldn't be measured", () => {
    const scores = scoreAudit(
      area("copy", {
        "copy.thin-descriptions": false,
        "copy.structured-data": null,
      }),
    );
    // 85 points measured, 30 lost: 100 × 55 / 85 = 64.7
    expect(areaScore(scores, "copy")).toMatchObject({
      score: 65,
      unknown: 1,
      coverage: 0.85,
    });
  });

  it("gives no area score when less than half its weight was measured", () => {
    const scores = scoreAudit(
      area("copy", {
        "copy.thin-descriptions": null,
        "copy.duplicate-descriptions": null,
        "copy.image-alt-text": null,
      }),
    );
    expect(areaScore(scores, "copy")).toMatchObject({
      score: null,
      grade: null,
      coverage: 0.3,
    });
  });

  it("averages scored areas by weight", () => {
    const scores = scoreAudit([
      ...area("copy"),
      ...area("search", {
        "search.typo-tolerance": false,
        "search.synonyms": false,
        "search.app": false,
      }),
      ...area("support", { "support.chat": false }),
    ]);
    // (100 × 25 + 0 × 20 + 50 × 15) / 60 = 54.2
    expect(scores.overall).toEqual({
      score: 54,
      grade: "big_opportunity",
      areasScored: 3,
    });
  });

  it("gives no overall score when areas worth less than half are scored", () => {
    const scores = scoreAudit([...area("copy"), ...area("support")]);
    expect(scores.overall).toEqual({
      score: null,
      grade: null,
      areasScored: 2,
    });
  });

  it("grades at the 80 and 60 boundaries", () => {
    expect(gradeFor(80)).toBe("good");
    expect(gradeFor(79)).toBe("needs_work");
    expect(gradeFor(60)).toBe("needs_work");
    expect(gradeFor(59)).toBe("big_opportunity");
    expect(gradeFor(null)).toBeNull();
  });
});
