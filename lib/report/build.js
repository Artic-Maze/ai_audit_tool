import { count, fmtInt } from "../checks/format.js";
import { sectionData } from "../checks/helpers.js";
import { buildRoadmap } from "../scoring/index.js";
import { AuditReport } from "./schema.js";

// What the report can't see, so nobody mistakes missing data for a finding.
function limitations(snapshot, checks) {
  const notes = [
    "Based on the public storefront only, without access to sales data or the store admin.",
    "App detection is best-effort: apps that load only after cookie consent or a click can be missed.",
    "Lift figures are estimates, not guarantees.",
  ];
  const products = sectionData(snapshot.products);
  if (snapshot.store.storefront === "headless") {
    notes.push(
      "This store uses a headless storefront, which doesn't expose product data publicly, so product checks couldn't run.",
    );
  } else if (!products) {
    notes.push(
      "Product data couldn't be collected, so product checks couldn't run.",
    );
  }
  if (products?.source === "sitemap") {
    notes.push(
      `Product checks used a sample of ${fmtInt(products.products.length)} products from the sitemap.`,
    );
  }
  if (products?.truncated) {
    notes.push(
      `Product checks covered the first ${fmtInt(products.products.length)} products in the catalog.`,
    );
  }
  const unmeasured = checks.filter(
    (c) => c.passed === null && c.area !== "performance",
  );
  if (unmeasured.length) {
    notes.push(
      `${count(unmeasured.length, "check")} couldn't be measured and ${unmeasured.length === 1 ? "isn't" : "aren't"} counted in the scores: ${unmeasured.map((c) => c.title).join(", ")}.`,
    );
  }
  if (snapshot.pagespeed.status !== "ok") {
    notes.push("PageSpeed data wasn't available for this audit.");
  }
  return notes;
}

export function buildReport({
  snapshot,
  checks,
  scores,
  opportunities,
  copyExamples,
  summary,
  llm,
  generatedAt = new Date(),
}) {
  const { store, crawl } = snapshot;
  return AuditReport.parse({
    version: 1,
    generatedAt: generatedAt.toISOString(),
    store: {
      name: store.name,
      domain: store.domain,
      url: store.origin,
      storefront: store.storefront,
      currency: store.currency,
      theme: store.theme?.schemaName ?? store.theme?.name ?? null,
    },
    scores,
    summary,
    opportunities,
    roadmap: buildRoadmap(opportunities).map(({ items, ...phase }) => ({
      ...phase,
      opportunityIds: items.map((o) => o.id),
    })),
    copyExamples,
    checks,
    performance: snapshot.pagespeed,
    limitations: limitations(snapshot, checks),
    meta: {
      crawl: {
        startedAt: crawl.startedAt,
        durationMs: crawl.durationMs,
        requestCount: crawl.requestCount,
      },
      llm,
    },
  });
}
