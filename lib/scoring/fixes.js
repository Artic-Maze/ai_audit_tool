import { byPriority } from "./roadmap.js";

// The AI fixes an audit can recommend. `pitch` is the default recommendation,
// used when the LLM's version isn't available.
export const FIXES = {
  "product-copy": {
    area: "copy",
    title: "Improve product descriptions with AI",
    pitch:
      "Use AI to draft fuller, distinct descriptions from each product's existing details, then review and publish them in batches.",
  },
  "alt-text": {
    area: "copy",
    title: "Generate image alt text with AI",
    pitch:
      "Generate descriptive alt text for product images with AI, for accessibility and image search.",
  },
  "seo-meta": {
    area: "copy",
    title: "Write SEO titles and meta descriptions with AI",
    pitch:
      "Generate an SEO title and meta description for each product with AI from its title, type and description.",
  },
  "structured-data": {
    area: "copy",
    title: "Add Product structured data to the theme",
    pitch:
      "Add Product JSON-LD to the product template so search engines and AI shopping assistants can read prices and availability.",
  },
  "ai-search": {
    area: "search",
    title: "Add AI-powered site search",
    pitch:
      "Add an AI search app that handles typos, synonyms and plurals so shoppers find products on the first try.",
  },
  "support-chat": {
    area: "support",
    title: "Add an AI support chat",
    pitch:
      "Add an AI chat assistant that answers shipping, returns and product questions from the store's own policies and catalog.",
  },
  "faq-page": {
    area: "support",
    title: "Publish an FAQ page drafted with AI",
    pitch:
      "Draft an FAQ page with AI from the store's policies and common customer questions.",
  },
  "contact-page": {
    area: "support",
    title: "Add a contact page",
    pitch: "Add a contact page so shoppers can reach the store.",
  },
  recommendations: {
    area: "recommendations",
    title: "Add AI product recommendations",
    pitch:
      "Add AI recommendations to product pages and the cart, suggesting related and frequently bought products.",
  },
  "email-flows": {
    area: "email",
    title: "Set up AI-personalized email and SMS flows",
    pitch:
      "Set up an email and SMS platform with AI-personalized welcome, abandoned-cart and post-purchase flows.",
  },
  "email-capture": {
    area: "email",
    title: "Capture more email signups",
    pitch:
      "Add a signup form and a popup whose offer is tested with AI, to grow the email list.",
  },
};

// What fixing each check is worth: impact (1–5) and effort (1–5). A fix's
// impact and effort are the highest among its failed checks, so the same
// failures always produce the same opportunities and roadmap.
export const CHECK_FIXES = {
  "copy.thin-descriptions": { fix: "product-copy", impact: 4, effort: 2 },
  "copy.duplicate-descriptions": { fix: "product-copy", impact: 3, effort: 2 },
  "copy.image-alt-text": { fix: "alt-text", impact: 2, effort: 1 },
  "copy.seo-meta": { fix: "seo-meta", impact: 3, effort: 1 },
  "copy.structured-data": { fix: "structured-data", impact: 3, effort: 2 },
  "search.typo-tolerance": { fix: "ai-search", impact: 4, effort: 3 },
  "search.synonyms": { fix: "ai-search", impact: 4, effort: 3 },
  "search.app": { fix: "ai-search", impact: 3, effort: 3 },
  "support.chat": { fix: "support-chat", impact: 4, effort: 3 },
  "support.faq-page": { fix: "faq-page", impact: 3, effort: 1 },
  "support.contact-page": { fix: "contact-page", impact: 2, effort: 1 },
  "recommendations.app": { fix: "recommendations", impact: 4, effort: 2 },
  "recommendations.related-section": {
    fix: "recommendations",
    impact: 3,
    effort: 2,
  },
  "email.app": { fix: "email-flows", impact: 5, effort: 3 },
  "email.signup-form": { fix: "email-capture", impact: 3, effort: 1 },
  "email.popup": { fix: "email-capture", impact: 3, effort: 1 },
};

export const MAX_OPPORTUNITIES = 10;

// One opportunity per fix with at least one failed check, highest priority
// first. The LLM later explains these; it never adds, drops or rescores them.
export function seedOpportunities(checks) {
  const failedByFix = new Map();
  for (const check of checks) {
    const link = CHECK_FIXES[check.id];
    if (check.passed !== false || !link) continue;
    if (!failedByFix.has(link.fix)) failedByFix.set(link.fix, []);
    failedByFix.get(link.fix).push(check.id);
  }
  return [...failedByFix]
    .map(([fix, checkIds]) => ({
      id: fix,
      area: FIXES[fix].area,
      title: FIXES[fix].title,
      impact: Math.max(...checkIds.map((id) => CHECK_FIXES[id].impact)),
      effort: Math.max(...checkIds.map((id) => CHECK_FIXES[id].effort)),
      evidenceRefs: checkIds,
    }))
    .sort(byPriority)
    .slice(0, MAX_OPPORTUNITIES);
}
