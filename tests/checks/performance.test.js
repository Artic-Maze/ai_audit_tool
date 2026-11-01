import { describe, expect, it } from "vitest";
import { runChecks } from "../../lib/checks/index.js";
import { scoreAudit } from "../../lib/scoring/index.js";
import {
  makeSnapshot,
  ORIGIN,
  pagespeedRun,
  pagespeedSection,
  unavailable,
} from "../fixtures/snapshot.js";
import { checkById } from "../helpers.js";

describe("performance checks", () => {
  it("prefer real-user data over the lab run", () => {
    const lcp = checkById(makeSnapshot(), "performance.lcp");
    expect(lcp).toMatchObject({ passed: true, value: 1900, display: "1.9 s" });
    expect(lcp.evidence).toEqual([
      "Real Chrome users, 75th percentile: 1.9 s.",
      "Lab test on the homepage (simulated mobile): 2.3 s.",
    ]);
  });

  it("fall back to the lab run without field data", () => {
    const snapshot = makeSnapshot({
      pagespeed: pagespeedSection([pagespeedRun({ field: null })]),
    });
    expect(checkById(snapshot, "performance.lcp").value).toBe(2300);
    expect(checkById(snapshot, "performance.cls").value).toBe(0.04);
    const inp = checkById(snapshot, "performance.inp");
    expect(inp.passed).toBeNull();
    expect(inp.evidence[0]).toBe(
      "INP needs real-user data, and Chrome has none for this site.",
    );
  });

  it("use the product page when the homepage run failed", () => {
    const snapshot = makeSnapshot({
      pagespeed: pagespeedSection([
        {
          page: "homepage",
          url: `${ORIGIN}/`,
          strategy: "mobile",
          status: "unavailable",
          error: "Quota exceeded",
        },
        pagespeedRun({
          page: "product",
          url: `${ORIGIN}/products/a`,
          lab: {
            performanceScore: 41,
            lcpMs: 4100,
            cls: 0.2,
            tbtMs: 900,
            fcpMs: 2000,
          },
        }),
      ]),
    });
    const score = checkById(snapshot, "performance.mobile-score");
    expect(score).toMatchObject({ passed: false, value: 41 });
    expect(score.evidence[0]).toBe(
      "Product page scores 41/100 on mobile in Google's Lighthouse lab test.",
    );
  });

  it("are unknown when PageSpeed was skipped", () => {
    const checks = runChecks(
      makeSnapshot({ pagespeed: unavailable("Skipped") }),
    );
    const perf = checks.filter((c) => c.area === "performance");
    expect(perf).toHaveLength(4);
    expect(perf.every((c) => c.passed === null)).toBe(true);
  });

  it("never change the score", () => {
    const slow = makeSnapshot({
      pagespeed: pagespeedSection([
        pagespeedRun({
          lab: {
            performanceScore: 12,
            lcpMs: 9000,
            cls: 0.5,
            tbtMs: 3000,
            fcpMs: 5000,
          },
          field: {
            scope: "url",
            overall: "SLOW",
            lcpMs: 6000,
            cls: 0.4,
            inpMs: 900,
          },
        }),
      ]),
    });
    expect(scoreAudit(runChecks(slow))).toEqual(
      scoreAudit(runChecks(makeSnapshot())),
    );
  });
});
