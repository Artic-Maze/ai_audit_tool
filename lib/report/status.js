// Status levels for the report UI. Status colors mean good -> bad, so they
// always appear with an icon and a text label, never as color alone.

export const GRADE_STATUS = {
  good: "good",
  needs_work: "warning",
  big_opportunity: "serious",
};

// Google's thresholds: Lighthouse scores and Core Web Vitals.
const SPEED_LIMITS = {
  lcpMs: [2500, 4000],
  cls: [0.1, 0.25],
  inpMs: [200, 500],
};

export function speedStatus(metric, value) {
  if (value === null || value === undefined) return null;
  if (metric === "score") {
    return value >= 90 ? "good" : value >= 50 ? "warning" : "critical";
  }
  const [good, poor] = SPEED_LIMITS[metric];
  return value <= good ? "good" : value <= poor ? "warning" : "critical";
}

export const SPEED_LABELS = {
  good: "Good",
  warning: "Needs improvement",
  critical: "Poor",
};
