import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { CrawlError, crawlStore } from "../lib/crawl/index.js";

const USAGE =
  "Usage: npm run crawl -- <store-url> [--out snapshot.json] [--no-products-json] [--no-pagespeed]";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", default: "snapshot.json" },
    // Forces the sitemap fallback, to test stores that block products.json.
    "no-products-json": { type: "boolean", default: false },
    "no-pagespeed": { type: "boolean", default: false },
  },
});

if (positionals.length !== 1) {
  console.error(USAGE);
  process.exit(1);
}

const yesNo = (check) =>
  check.exists === null
    ? `unknown (${check.error})`
    : check.exists
      ? `yes (${check.via})`
      : "no";

const DESCRIBE = {
  homepage: (d) =>
    `"${d.title}" · theme ${d.theme?.schemaName ?? d.theme?.name ?? "unknown"} · newsletter form ${d.newsletterForm.present ? "yes" : "no"}`,
  products: (d) =>
    d.source === "sitemap"
      ? `${d.products.length} sampled of ${d.catalogSize} in sitemap (products.json: ${d.productsJsonError})`
      : `${d.products.length} via products.json${d.truncated ? " (capped)" : ""} · alt text from ${d.altSample.fetched}/${d.altSample.requested} sampled`,
  collections: (d) => `${d.count}${d.truncated ? "+" : ""}`,
  productPages: (d) =>
    `${d.pages.filter((p) => p.status === "ok").length}/${d.pages.length} fetched`,
  pages: (d) => `FAQ ${yesNo(d.faq)} · contact ${yesNo(d.contact)}`,
  apps: (d) =>
    d.detected.length
      ? d.detected
          .map((a) => `${a.name} (${a.categories.join("/")})`)
          .join(", ")
      : "none detected",
  search: (d) =>
    d.queries
      .map(
        (q) =>
          `${q.kind} "${q.query}": page ${q.pageCount ?? "–"}, suggest ${q.suggestCount ?? "–"}`,
      )
      .join(" · ") +
    ` [reliable: page ${d.reliable.page ? "yes" : "no"}, suggest ${d.reliable.suggest ? "yes" : "no"}]`,
  pagespeed: (d) =>
    d.runs
      .map((r) =>
        r.status === "ok"
          ? `${r.page}/${r.strategy} ${r.lab.performanceScore}`
          : `${r.page}/${r.strategy} unavailable (${r.error})`,
      )
      .join(" · "),
};

function printSummary(snapshot, out) {
  const { store, crawl } = snapshot;
  console.log(
    `\n✓ ${store.domain} is a ${store.storefront === "headless" ? "headless " : ""}Shopify store (${store.detectedBy.join(", ")})`,
  );
  for (const [key, describe] of Object.entries(DESCRIBE)) {
    const section = snapshot[key];
    const detail =
      section.status === "ok" ? describe(section.data) : section.error;
    console.log(`  ${key.padEnd(13)} ${section.status.padEnd(12)} ${detail}`);
  }
  console.log(
    `\n${crawl.requestCount} requests in ${(crawl.durationMs / 1000).toFixed(1)}s → ${out}`,
  );
}

try {
  const snapshot = await crawlStore(positionals[0], {
    skipProductsJson: values["no-products-json"],
    skipPageSpeed: values["no-pagespeed"],
    onProgress: (stage) => console.error(`→ ${stage}`),
  });
  await writeFile(values.out, `${JSON.stringify(snapshot, null, 2)}\n`);
  printSummary(snapshot, values.out);
} catch (err) {
  if (err instanceof CrawlError) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  throw err;
}
