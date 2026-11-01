import { count, pct } from "./format.js";
import {
  appCheck,
  appsIn,
  joinNames,
  productPages,
  unknown,
} from "./helpers.js";

export const MIN_RELATED_SHARE = 50;

function relatedSection(snapshot) {
  const { pages, error } = productPages(snapshot);
  if (error) return unknown(error);
  const found = pages.filter((p) => p.hasRecommendations);
  const share = pct(found.length, pages.length);
  const display = `${found.length} of ${count(pages.length, "page")}`;
  if (share >= MIN_RELATED_SHARE) {
    return {
      passed: true,
      value: share,
      display,
      evidence: [
        `Related-products section found on ${found.length} of ${count(pages.length, "sampled product page")} (${found[0].recommendationsEvidence}).`,
      ],
    };
  }

  // Recommendation apps usually inject their widgets with JavaScript, so a
  // missing section in the HTML proves nothing when one is installed.
  const { apps, error: appsError } = appsIn(snapshot, "recommendations");
  if (appsError) return unknown(appsError);
  if (apps.length > 0) {
    return unknown(
      `No related-products section in the product page HTML, but ${joinNames(apps)} can add one with JavaScript, so this can't be confirmed.`,
    );
  }
  return {
    passed: false,
    value: share,
    display,
    evidence: [
      `No "you may also like" or related-products section on ${pages.length - found.length} of ${count(pages.length, "sampled product page")}.`,
    ],
  };
}

export const RECOMMENDATION_CHECKS = [
  {
    id: "recommendations.app",
    area: "recommendations",
    title: "Recommendations app",
    metric: "Recommendations or upsell app detected",
    threshold: "Detected",
    run: appCheck("recommendations", "recommendations or upsell app"),
  },
  {
    id: "recommendations.related-section",
    area: "recommendations",
    title: "Related products on product pages",
    metric: `Share of sampled product pages with a "you may also like" or related-products section`,
    threshold: `${MIN_RELATED_SHARE}% or more`,
    run: relatedSection,
  },
];
