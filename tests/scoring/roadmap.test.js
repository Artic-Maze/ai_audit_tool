import { describe, expect, it } from "vitest";
import { runChecks } from "../../lib/checks/index.js";
import {
  buildRoadmap,
  phaseFor,
  seedOpportunities,
} from "../../lib/scoring/index.js";
import { weakStore } from "../fixtures/stores.js";

describe("phaseFor", () => {
  it.each([
    [4, 2, 1],
    [5, 1, 1],
    [4, 3, 2],
    [3, 3, 2],
    [3, 4, 2],
    [5, 5, 3],
    [2, 3, 3],
    // The plan's rules put medium-impact quick wins last.
    [3, 2, 3],
    [3, 1, 3],
  ])("impact %i, effort %i → phase %i", (impact, effort, phase) => {
    expect(phaseFor({ impact, effort })).toBe(phase);
  });
});

describe("buildRoadmap", () => {
  const items = [
    { id: "b", impact: 4, effort: 2 },
    { id: "a", impact: 4, effort: 2 },
    { id: "c", impact: 5, effort: 1 },
    { id: "d", impact: 3, effort: 3 },
    { id: "e", impact: 2, effort: 1 },
  ];

  it("groups by phase, best impact-to-effort first", () => {
    const roadmap = buildRoadmap(items);
    expect(roadmap.map((p) => p.label)).toEqual([
      "0–30 days",
      "30–60 days",
      "60–90 days",
    ]);
    expect(roadmap.map((p) => p.items.map((o) => o.id))).toEqual([
      ["c", "a", "b"],
      ["d"],
      ["e"],
    ]);
  });

  it("gives the same roadmap for any input order", () => {
    expect(buildRoadmap([...items].reverse())).toEqual(buildRoadmap(items));
  });

  it("rejects impact or effort outside 1–5", () => {
    expect(() => buildRoadmap([{ id: "x", impact: 6, effort: 1 }])).toThrow(
      /1–5/,
    );
    expect(() => buildRoadmap([{ id: "y", impact: 3, effort: 2.5 }])).toThrow(
      /1–5/,
    );
  });
});

describe("seedOpportunities", () => {
  it("drafts one opportunity per failed scored check", () => {
    const checks = runChecks(weakStore);
    const seeds = seedOpportunities(checks);
    const failedScored = checks.filter(
      (c) => c.passed === false && c.area !== "performance",
    );
    expect(seeds.map((s) => s.id)).toEqual(failedScored.map((c) => c.id));
    expect(seeds[0]).toEqual({
      id: "copy.thin-descriptions",
      area: "copy",
      title: "Write fuller product descriptions with AI",
      impact: 4,
      effort: 2,
      evidenceRefs: ["copy.thin-descriptions"],
    });
  });
});
