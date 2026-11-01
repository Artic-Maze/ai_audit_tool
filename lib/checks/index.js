import { COPY_CHECKS } from "./copy.js";
import { EMAIL_CHECKS } from "./email.js";
import { unknown } from "./helpers.js";
import { PERFORMANCE_CHECKS } from "./performance.js";
import { RECOMMENDATION_CHECKS } from "./recommendations.js";
import { SEARCH_CHECKS } from "./search.js";
import { SUPPORT_CHECKS } from "./support.js";

export { AREAS, AREA_LABELS } from "./areas.js";

export const CHECKS = [
  ...COPY_CHECKS,
  ...SEARCH_CHECKS,
  ...SUPPORT_CHECKS,
  ...RECOMMENDATION_CHECKS,
  ...EMAIL_CHECKS,
  ...PERFORMANCE_CHECKS,
];

// Run every check against a snapshot. Pure and deterministic: the same
// snapshot always produces the same results, in the same order.
export function runChecks(snapshot) {
  return CHECKS.map(({ run, ...definition }) => {
    let outcome;
    try {
      outcome = run(snapshot);
    } catch (err) {
      // A bug in one check shouldn't sink the whole audit.
      outcome = unknown(`This check failed to run (${err.message}).`);
    }
    return { ...definition, ...outcome };
  });
}
