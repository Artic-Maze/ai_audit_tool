import { isGiftCard, THIN_WORDS } from "../checks/copy.js";
import { sectionData } from "../checks/helpers.js";
import { compareText } from "../compare.js";
import { evenSample } from "../crawl/products.js";
import {
  CHECK_FIXES,
  gradeLabel,
  phaseFor,
  ROADMAP_PHASES,
} from "../scoring/index.js";

// What each prompt is told about the store. Every selection is deterministic,
// so the same snapshot always produces the same prompt.

const TEST_PRODUCT = /\btest product\b|\bdo not (buy|purchase)\b/i;

const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const byHandle = (a, b) => compareText(a.handle, b.handle);

// Products worth quoting: no gift cards or test listings.
function realProducts(snapshot) {
  const products = sectionData(snapshot.products)?.products ?? [];
  return products
    .filter((p) => !isGiftCard(p) && !TEST_PRODUCT.test(p.title))
    .sort(byHandle);
}

function productFacts(product, snapshot, descriptionChars) {
  return {
    handle: product.handle,
    title: product.title,
    productType: product.productType,
    tags: product.tags.slice(0, 8),
    price: product.price,
    currency: snapshot.store.currency,
    descriptionWordCount: product.descriptionWordCount,
    description: clip(product.descriptionText, descriptionChars),
  };
}

function storeFacts(snapshot) {
  const products = sectionData(snapshot.products);
  return {
    name: snapshot.store.name,
    domain: snapshot.store.domain,
    storefront: snapshot.store.storefront,
    products: products && {
      checked: products.products.length,
      scope:
        products.source === "sitemap"
          ? `a sample of ${products.products.length} from the ${products.catalogSize} products in the sitemap`
          : products.truncated
            ? `the first ${products.products.length} products in the catalog, which may be larger`
            : "the full catalog",
    },
  };
}

function scoreFacts(scores) {
  return {
    outOf: 100,
    overall: {
      score: scores.overall.score,
      grade: gradeLabel(scores.overall.grade),
    },
    areas: scores.areas.map((a) => ({
      area: a.label,
      score: a.score,
      grade: gradeLabel(a.grade),
    })),
  };
}

function notMeasured(checks) {
  return checks
    .filter((c) => c.passed === null && c.area !== "performance")
    .map((c) => ({ check: c.title, reason: c.evidence[0] }));
}

// Thin descriptions to rewrite: the shortest ones that say something, so
// there's a "before" worth showing; empty ones only if nothing else is thin.
export function weakestProducts(snapshot, n = 2) {
  return realProducts(snapshot)
    .filter((p) => p.descriptionWordCount < THIN_WORDS)
    .sort(
      (a, b) =>
        (a.descriptionWordCount === 0) - (b.descriptionWordCount === 0) ||
        a.descriptionWordCount - b.descriptionWordCount ||
        byHandle(a, b),
    )
    .slice(0, n);
}

export function opportunitiesFacts({
  snapshot,
  checks,
  scores,
  opportunities,
}) {
  const byId = new Map(checks.map((c) => [c.id, c]));
  return {
    store: storeFacts(snapshot),
    scores: scoreFacts(scores),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      area: o.area,
      suggestedTitle: o.title,
      impact: o.impact,
      effort: o.effort,
      failedChecks: o.evidenceRefs.map((id) => {
        const check = byId.get(id);
        return {
          check: check.title,
          result: check.display,
          target: check.threshold,
          evidence: check.evidence,
        };
      }),
      // Passed checks under the same fix, so the write-up doesn't recommend
      // something the store already has.
      alreadyInPlace: checks
        .filter((c) => c.passed === true && CHECK_FIXES[c.id]?.fix === o.id)
        .map((c) => ({
          check: c.title,
          result: c.display,
          evidence: c.evidence[0],
        })),
    })),
    detectedApps:
      sectionData(snapshot.apps)?.detected.map((a) => ({
        name: a.name,
        categories: a.categories,
      })) ?? null,
    notMeasured: notMeasured(checks),
    sampleProducts: evenSample(realProducts(snapshot), 10).map((p) =>
      productFacts(p, snapshot, 300),
    ),
  };
}

export function copyFacts({ snapshot, products }) {
  return {
    store: { name: snapshot.store.name, domain: snapshot.store.domain },
    products: products.map((p) => productFacts(p, snapshot, 2000)),
    // The store's own longest descriptions, so the rewrite can match its voice.
    voiceExamples: realProducts(snapshot)
      .filter((p) => p.descriptionWordCount >= THIN_WORDS)
      .sort(
        (a, b) =>
          b.descriptionWordCount - a.descriptionWordCount || byHandle(a, b),
      )
      .slice(0, 2)
      .map((p) => ({
        title: p.title,
        description: clip(p.descriptionText, 700),
      })),
  };
}

export function summaryFacts({ snapshot, checks, scores, opportunities }) {
  const titles = new Map(checks.map((c) => [c.id, c.title]));
  return {
    store: storeFacts(snapshot),
    scores: scoreFacts(scores),
    opportunityCount: opportunities.length,
    topOpportunities: opportunities.slice(0, 5).map((o) => ({
      title: o.title,
      failedChecks: o.evidenceRefs.map((id) => titles.get(id)),
      impact: o.impact,
      effort: o.effort,
      timeline: ROADMAP_PHASES[phaseFor(o) - 1].label,
    })),
    notMeasured: notMeasured(checks),
  };
}
