import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export const loadHtml = (html) => cheerio.load(html);

// Product descriptions are HTML. Pad tags with spaces so "<p>a</p><p>b</p>"
// doesn't collapse into one word, and drop script/style contents.
export function htmlToText(html) {
  if (!html) return "";
  const $ = cheerio.load(html.replace(/</g, " <"));
  $("script, style").remove();
  return $.root().text().replace(/\s+/g, " ").trim();
}

export function wordCount(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// Same hash for descriptions that differ only in case, punctuation or spacing.
export function textHash(text) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  if (!normalized) return null;
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

export function absoluteUrl(href, base) {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

export function meta($, key) {
  const content = $(`meta[name="${key}"], meta[property="${key}"]`)
    .first()
    .attr("content");
  return content?.trim() || null;
}

export function jsonLdTypes($) {
  const types = new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      collectTypes(JSON.parse($(el).text()), types);
    } catch {
      // Malformed JSON-LD is common; skip the block.
    }
  });
  return [...types].sort();
}

function collectTypes(node, types) {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, types);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const type of [node["@type"]].flat()) {
    if (typeof type === "string") types.add(type);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectTypes(value, types);
  }
}

function jsonAssignment(html, name) {
  const match = html.match(new RegExp(`${name}\\s*=\\s*(\\{[^;]*?\\});`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// The globals Shopify prints into every storefront page.
export function shopifyGlobals(html) {
  const theme = jsonAssignment(html, "Shopify\\.theme");
  return {
    theme: theme
      ? {
          name: theme.name ?? null,
          schemaName: theme.schema_name ?? null,
          schemaVersion: theme.schema_version ?? null,
          themeStoreId: theme.theme_store_id ?? null,
        }
      : null,
    myshopifyDomain: html.match(/Shopify\.shop\s*=\s*"([^"]+)"/)?.[1] ?? null,
    currency: jsonAssignment(html, "Shopify\\.currency")?.active ?? null,
    locale: html.match(/Shopify\.locale\s*=\s*"([^"]+)"/)?.[1] ?? null,
  };
}

export function scriptSrcs($, base) {
  const srcs = new Set();
  $("script[src]").each((_, el) => {
    const url = absoluteUrl($(el).attr("src"), base);
    if (url) srcs.add(url);
  });
  return [...srcs];
}
