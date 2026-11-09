import { beforeAll, describe, expect, it } from "vitest";
import { auditSnapshot } from "../../lib/audit.js";
import { LlmError } from "../../lib/llm/client.js";
import { viewReport } from "../../lib/report/view.js";
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

const SECTIONS = [
  "store",
  "scores",
  "summary",
  "roadmap",
  "copyExamples",
  "performance",
  "checks",
  "limitations",
];

describe("viewReport", () => {
  it("sends the whole report", () => {
    const view = viewReport(report);
    for (const key of SECTIONS) expect(view[key]).toEqual(report[key]);
    expect(view.opportunities).toHaveLength(report.opportunities.length);
    expect(view.crawl).toEqual(report.meta.crawl);
  });

  it("never sends internal LLM metadata", () => {
    const json = JSON.stringify(viewReport(report));
    expect(json).not.toContain("inputTokens");
    expect(json).not.toContain("offline");
  });

  it("names the checks behind each opportunity", () => {
    const [first] = viewReport(report).opportunities;
    expect(first).toMatchObject({
      id: "email-flows",
      basedOn: ["Email or SMS app"],
    });
  });
});
