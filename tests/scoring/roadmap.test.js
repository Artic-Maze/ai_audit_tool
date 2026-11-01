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
    [3, 2, 1],
    [3, 1, 1],
    [2, 3, 3],
    [2, 1, 3],
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

  it("groups by phase, highest impact first", () => {
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
  it("drafts one opportunity per fix, highest impact first", () => {
    const seeds = seedOpportunities(runChecks(weakStore));
    expect(seeds.map((s) => [s.id, s.impact, s.effort])).toEqual([
      ["email-flows", 5, 3],
      ["product-copy", 4, 2],
      ["recommendations", 4, 2],
      ["ai-search", 4, 3],
      ["support-chat", 4, 3],
      ["email-capture", 3, 1],
      ["faq-page", 3, 1],
      ["seo-meta", 3, 1],
      ["structured-data", 3, 2],
      ["alt-text", 2, 1],
    ]);
  });

  it("groups related failed checks and takes their highest impact and effort", () => {
    const seeds = seedOpportunities(runChecks(weakStore));
    expect(seeds.find((s) => s.id === "ai-search")).toEqual({
      id: "ai-search",
      area: "search",
      title: "Add AI-powered site search",
      impact: 4,
      effort: 3,
      evidenceRefs: ["search.typo-tolerance", "search.synonyms", "search.app"],
    });
  });

  it("scores a fix only by the checks that actually failed", () => {
    const checks = [
      { id: "search.typo-tolerance", area: "search", passed: true },
      { id: "search.synonyms", area: "search", passed: null },
      { id: "search.app", area: "search", passed: false },
    ];
    expect(seedOpportunities(checks)).toMatchObject([
      { id: "ai-search", impact: 3, effort: 3, evidenceRefs: ["search.app"] },
    ]);
  });
});
