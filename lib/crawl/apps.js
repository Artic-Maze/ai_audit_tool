import { APP_CATEGORIES, APP_FINGERPRINTS } from "./apps-fingerprints.js";
import { absoluteUrl, loadHtml } from "./html.js";

const ASSET_LINK_RELS = new Set([
  "stylesheet",
  "preload",
  "preconnect",
  "dns-prefetch",
  "modulepreload",
]);

function pageAssets($, base) {
  const urls = new Set();
  const add = (href) => {
    const url = absoluteUrl(href, base);
    if (url) urls.add(url);
  };
  $("script[src]").each((_, el) => add($(el).attr("src")));
  $("iframe[src]").each((_, el) => add($(el).attr("src")));
  $("link[href]").each((_, el) => {
    const rels = ($(el).attr("rel") ?? "").toLowerCase().split(/\s+/);
    if (rels.some((rel) => ASSET_LINK_RELS.has(rel))) add($(el).attr("href"));
  });
  const inline = $("script:not([src])")
    .map((_, el) => $(el).text())
    .get()
    .join("\n")
    .toLowerCase();
  return { urls: [...urls], inline };
}

function matchApp(app, $, assets) {
  for (const pattern of app.patterns) {
    const url = assets.urls.find((u) => u.toLowerCase().includes(pattern));
    if (url) return url.length > 140 ? `${url.slice(0, 140)}…` : url;
    if (assets.inline.includes(pattern)) return `"${pattern}" in inline script`;
  }
  for (const selector of app.selectors ?? []) {
    if ($(selector).length > 0) return `element ${selector}`;
  }
  return null;
}

// documents: [{ page: "homepage" | "product", url, html }]
export function detectApps(documents) {
  const found = new Map();
  for (const doc of documents) {
    const $ = loadHtml(doc.html);
    const assets = pageAssets($, doc.url);
    for (const app of APP_FINGERPRINTS) {
      if (found.has(app.id)) continue;
      const evidence = matchApp(app, $, assets);
      if (evidence) {
        found.set(app.id, {
          id: app.id,
          name: app.name,
          categories: app.categories,
          evidence,
          foundOn: doc.url,
        });
      }
    }
  }

  const detected = [...found.values()];
  const byCategory = Object.fromEntries(
    APP_CATEGORIES.map((category) => [
      category,
      detected.filter((a) => a.categories.includes(category)).map((a) => a.id),
    ]),
  );
  return {
    detected,
    byCategory,
    pagesScanned: documents.map((d) => d.url),
  };
}
