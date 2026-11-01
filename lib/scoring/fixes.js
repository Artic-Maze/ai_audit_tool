// The AI fix each failed check points to, with a fixed impact (1–5) and
// effort (1–5). Fixed values keep the roadmap reproducible: the same failed
// checks always land in the same phases.
export const CHECK_FIXES = {
  "copy.thin-descriptions": {
    fix: "Write fuller product descriptions with AI",
    impact: 4,
    effort: 2,
  },
  "copy.duplicate-descriptions": {
    fix: "Rewrite duplicated descriptions so each product stands out",
    impact: 3,
    effort: 2,
  },
  "copy.image-alt-text": {
    fix: "Generate image alt text with AI",
    impact: 2,
    effort: 1,
  },
  "copy.seo-meta": {
    fix: "Write SEO titles and meta descriptions with AI",
    impact: 3,
    effort: 1,
  },
  "copy.structured-data": {
    fix: "Add Product structured data to the theme",
    impact: 3,
    effort: 2,
  },
  "search.typo-tolerance": {
    fix: "Add AI search that forgives typos",
    impact: 4,
    effort: 3,
  },
  "search.synonyms": {
    fix: "Add semantic search that understands synonyms and plurals",
    impact: 4,
    effort: 3,
  },
  "search.app": {
    fix: "Install an AI search and discovery app",
    impact: 3,
    effort: 3,
  },
  "support.chat": {
    fix: "Add an AI support chat that answers from store policies and products",
    impact: 4,
    effort: 3,
  },
  "support.faq-page": {
    fix: "Publish an FAQ page drafted with AI from common questions",
    impact: 3,
    effort: 1,
  },
  "support.contact-page": {
    fix: "Add a contact page",
    impact: 2,
    effort: 1,
  },
  "recommendations.app": {
    fix: "Add AI product recommendations",
    impact: 4,
    effort: 2,
  },
  "recommendations.related-section": {
    fix: "Show related products on product pages",
    impact: 3,
    effort: 2,
  },
  "email.app": {
    fix: "Set up AI-personalised email and SMS flows",
    impact: 5,
    effort: 3,
  },
  "email.signup-form": {
    fix: "Add a newsletter signup form to the homepage",
    impact: 3,
    effort: 1,
  },
  "email.popup": {
    fix: "Add a signup popup with an AI-tested offer",
    impact: 3,
    effort: 1,
  },
};

// One draft opportunity per failed scored check, with its default impact and
// effort. Enough to preview the roadmap before the LLM writes anything.
export function seedOpportunities(checks) {
  return checks
    .filter((c) => c.passed === false && CHECK_FIXES[c.id])
    .map((c) => ({
      id: c.id,
      area: c.area,
      title: CHECK_FIXES[c.id].fix,
      impact: CHECK_FIXES[c.id].impact,
      effort: CHECK_FIXES[c.id].effort,
      evidenceRefs: [c.id],
    }));
}
