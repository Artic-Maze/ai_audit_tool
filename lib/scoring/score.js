import { AREAS, AREA_LABELS } from "../checks/areas.js";
import { sum } from "../checks/format.js";
import {
  AREA_WEIGHTS,
  CHECK_WEIGHTS,
  GRADES,
  MIN_COVERAGE,
} from "./weights.js";

export function gradeFor(score) {
  if (score === null) return null;
  return GRADES.find((grade) => score >= grade.min).key;
}

export function gradeLabel(key) {
  return GRADES.find((grade) => grade.key === key)?.label ?? "Not enough data";
}

function weightOf(checkId) {
  const weight = CHECK_WEIGHTS[checkId];
  if (weight === undefined) throw new Error(`No weight defined for ${checkId}`);
  return weight;
}

// The area starts at 100 and loses each failed check's weight. Checks that
// couldn't be measured are left out and the rest scaled back up to 100, so
// missing data never counts as a pass or a failure. With every check
// measured this is exactly 100 minus the failed weights.
function scoreArea(area, checks) {
  const own = checks.filter((c) => c.area === area);
  const measured = own.filter((c) => c.passed !== null);
  const failed = measured.filter((c) => c.passed === false);
  const totalWeight = sum(own.map((c) => weightOf(c.id)));
  const measuredWeight = sum(measured.map((c) => weightOf(c.id)));
  const lostWeight = sum(failed.map((c) => weightOf(c.id)));
  const coverage = totalWeight ? measuredWeight / totalWeight : 0;
  const score =
    coverage >= MIN_COVERAGE
      ? Math.round((100 * (measuredWeight - lostWeight)) / measuredWeight)
      : null;
  return {
    area,
    label: AREA_LABELS[area],
    weight: AREA_WEIGHTS[area],
    score,
    grade: gradeFor(score),
    coverage: Math.round(coverage * 100) / 100,
    passed: measured.length - failed.length,
    failed: failed.length,
    unknown: own.length - measured.length,
    deductions: failed.map((c) => ({ checkId: c.id, weight: weightOf(c.id) })),
  };
}

// Area scores plus the overall score: a weighted average of the areas that
// could be scored. Performance checks are context only and never scored.
export function scoreAudit(checks) {
  const areas = AREAS.map((area) => scoreArea(area, checks));
  const scored = areas.filter((a) => a.score !== null);
  const scoredWeight = sum(scored.map((a) => a.weight));
  const totalWeight = sum(areas.map((a) => a.weight));
  const score =
    scoredWeight >= totalWeight * MIN_COVERAGE
      ? Math.round(sum(scored.map((a) => a.score * a.weight)) / scoredWeight)
      : null;
  return {
    overall: { score, grade: gradeFor(score), areasScored: scored.length },
    areas,
  };
}
