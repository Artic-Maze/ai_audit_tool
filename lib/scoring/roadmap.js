import { compareText } from "../compare.js";

export const ROADMAP_PHASES = [
  { phase: 1, label: "0–30 days", rule: "Impact 3+ and effort 2 or less" },
  { phase: 2, label: "30–60 days", rule: "Impact 3+ and effort 3–4" },
  { phase: 3, label: "60–90 days", rule: "Everything else" },
];

export function phaseFor({ impact, effort }) {
  if (impact >= 3 && effort <= 2) return 1;
  if (impact >= 3 && effort >= 3 && effort <= 4) return 2;
  return 3;
}

// Highest impact first, then least effort, then id, so the order never
// depends on the input order.
export function byPriority(a, b) {
  return b.impact - a.impact || a.effort - b.effort || compareText(a.id, b.id);
}

const isScale = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

// opportunities: [{ id, impact: 1–5, effort: 1–5, ... }]
export function buildRoadmap(opportunities) {
  for (const o of opportunities) {
    if (!isScale(o.impact) || !isScale(o.effort)) {
      throw new Error(`Impact and effort must be whole numbers 1–5 (${o.id})`);
    }
  }
  const sorted = [...opportunities].sort(byPriority);
  return ROADMAP_PHASES.map((p) => ({
    ...p,
    items: sorted.filter((o) => phaseFor(o) === p.phase),
  }));
}
