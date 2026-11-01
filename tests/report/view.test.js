import { beforeAll, describe, expect, it } from "vitest";
import { auditSnapshot } from "../../lib/audit.js";
import { LlmError } from "../../lib/llm/client.js";
import { FREE_OPPORTUNITIES, viewReport } from "../../lib/report/view.js";
import { weakStore } from "../fixtures/stores.js";

async function offline({ name }) {
  throw new LlmError(`${name}: offline`, {
    usage: { inputTokens: 0, outputTokens: 0 },
    attempts: 1,
    rejected: [],
  });
}

let report;
beforeAll(async () => {
  report = await auditSnapshot(weakStore, { generate: offline });
});

const LOCKED_SECTIONS = [
  "summary",
  "roadmap",
  "copyExamples",
  "performance",
  "checks",
];

describe("viewReport", () => {
  it("sends only the free sections before unlocking", () => {
    const view = viewReport(report, { unlocked: false });
    expect(view.unlocked).toBe(false);
    expect(view.opportunities).toHaveLength(FREE_OPPORTUNITIES);
    for (const key of LOCKED_SECTIONS) expect(view).not.toHaveProperty(key);
    expect(view.scores).toEqual(report.scores);
    expect(view.locked).toEqual({
      opportunities: report.opportunities.length - FREE_OPPORTUNITIES,
      copyExamples: 0,
      performance: true,
    });
  });

  it("sends everything once unlocked", () => {
    const view = viewReport(report, { unlocked: true });
    expect(view.unlocked).toBe(true);
    expect(view.opportunities).toHaveLength(report.opportunities.length);
    for (const key of LOCKED_SECTIONS) expect(view).toHaveProperty(key);
    expect(view).not.toHaveProperty("locked");
  });

  it("never sends internal LLM metadata", () => {
    for (const unlocked of [false, true]) {
      const json = JSON.stringify(viewReport(report, { unlocked }));
      expect(json).not.toContain("inputTokens");
      expect(json).not.toContain("offline");
    }
  });

  it("names the checks behind each opportunity", () => {
    const [first] = viewReport(report, { unlocked: false }).opportunities;
    expect(first).toMatchObject({
      id: "email-flows",
      basedOn: ["Email or SMS app"],
    });
  });
});
