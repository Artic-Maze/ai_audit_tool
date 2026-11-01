import { describe, expect, it } from "vitest";
import { auditSnapshot } from "../lib/audit.js";
import { LlmError } from "../lib/llm/client.js";
import { AuditReport } from "../lib/report/schema.js";
import { headlessStore, weakStore } from "./fixtures/stores.js";

// No network in tests: every LLM call fails, so the report uses its templates.
async function offline({ name }) {
  throw new LlmError(`${name}: offline`, {
    usage: { inputTokens: 0, outputTokens: 0 },
    attempts: 1,
    rejected: [],
  });
}

describe("auditSnapshot", () => {
  it("builds a valid report even when every LLM call fails", async () => {
    const report = await auditSnapshot(weakStore, { generate: offline });
    expect(() => AuditReport.parse(report)).not.toThrow();
    expect(report.scores.overall).toEqual({
      score: 3,
      grade: "big_opportunity",
      areasScored: 5,
    });
    expect(report.summary.source).toBe("template");
    expect(report.opportunities.every((o) => o.source === "template")).toBe(
      true,
    );
  });

  it("puts every opportunity in exactly one roadmap phase, matching its own", async () => {
    const report = await auditSnapshot(weakStore, { generate: offline });
    const placed = report.roadmap.flatMap((p) =>
      p.opportunityIds.map((id) => [id, p.phase]),
    );
    expect(placed.map(([id]) => id).sort()).toEqual(
      report.opportunities.map((o) => o.id).sort(),
    );
    for (const [id, phase] of placed) {
      expect(report.opportunities.find((o) => o.id === id).phase).toBe(phase);
    }
  });

  it("lists what the audit couldn't see", async () => {
    const report = await auditSnapshot(headlessStore, { generate: offline });
    expect(report.store.storefront).toBe("headless");
    expect(report.limitations).toContain(
      "This store uses a headless storefront, which doesn't expose product data publicly, so product checks couldn't run.",
    );
    expect(report.limitations.at(-1)).toMatch(
      /^\d+ checks couldn't be measured/,
    );
  });

  it("gives the same report for the same snapshot, apart from its timestamp", async () => {
    const strip = ({ generatedAt, ...rest }) => rest;
    const first = await auditSnapshot(weakStore, { generate: offline });
    const second = await auditSnapshot(structuredClone(weakStore), {
      generate: offline,
    });
    expect(strip(second)).toEqual(strip(first));
  });
});
