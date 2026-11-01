// Points a failed check costs its area. Each area's weights add up to 100,
// so failing everything in an area scores 0 there.
export const CHECK_WEIGHTS = {
  "copy.thin-descriptions": 30,
  "copy.duplicate-descriptions": 20,
  "copy.image-alt-text": 20,
  "copy.seo-meta": 15,
  "copy.structured-data": 15,

  "search.typo-tolerance": 40,
  "search.synonyms": 35,
  "search.app": 25,

  "support.chat": 50,
  "support.faq-page": 30,
  "support.contact-page": 20,

  "recommendations.app": 50,
  "recommendations.related-section": 50,

  "email.app": 50,
  "email.signup-form": 25,
  "email.popup": 25,
};

// How much each area counts toward the overall score (adds up to 100).
export const AREA_WEIGHTS = {
  copy: 25,
  search: 20,
  support: 15,
  recommendations: 20,
  email: 20,
};

// An area needs at least this share of its check weight measured to get a
// score, and the overall score needs this share of area weight scored.
export const MIN_COVERAGE = 0.5;

export const GRADES = [
  { key: "good", label: "Good", min: 80 },
  { key: "needs_work", label: "Needs work", min: 60 },
  { key: "big_opportunity", label: "Big opportunity", min: 0 },
];
