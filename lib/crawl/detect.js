import { normalizeStoreUrl } from "../url.js";
import { CrawlError } from "./errors.js";

// Fetch the homepage (following redirects to the canonical domain) and confirm
// the site is a Shopify storefront. Throws CrawlError with a user-facing message.
export async function detectShopify(client, inputUrl) {
  const start = normalizeStoreUrl(inputUrl);
  if (!start) {
    throw new CrawlError(
      "invalid_url",
      "That doesn't look like a store address. Try something like yourstore.com.",
    );
  }
  const host = new URL(start).hostname;

  let res;
  try {
    res = await client.get(start);
  } catch (err) {
    if (err instanceof CrawlError) throw err;
    throw new CrawlError(
      "unreachable",
      `We couldn't reach ${host}. Check the address and try again.`,
    );
  }

  // A 429 that survived the client's retries is a refusal too.
  if (res.blocked || res.status === 429 || res.status === 403) {
    throw new CrawlError(
      "blocked",
      `${host} has bot protection that blocked our crawler, so we can't audit it right now.`,
    );
  }
  const final = new URL(res.url);
  if (final.pathname.startsWith("/password")) {
    throw new CrawlError(
      "password_protected",
      `${final.hostname} is password protected, so there's nothing public to audit.`,
    );
  }
  if (!res.ok) {
    throw new CrawlError(
      "unreachable",
      `${final.hostname} responded with an error (HTTP ${res.status}).`,
    );
  }

  const signals = [];
  if (res.headers.get("x-shopid")) signals.push("x-shopid header");
  if (/shopify/i.test(res.headers.get("powered-by") ?? "")) {
    signals.push("powered-by header");
  }
  if (/Shopify\.theme\s*=/.test(res.text)) signals.push("Shopify.theme");
  if (/cdn\.shopify\.com|\/cdn\/shop\//.test(res.text)) {
    signals.push("Shopify CDN assets");
  }

  if (signals.length === 0) {
    const probe = await client
      .get(`${final.origin}/products.json?limit=1`, {
        accept: "application/json",
      })
      .catch(() => null);
    if (probe?.ok && /^\s*\{\s*"products"\s*:/.test(probe.text)) {
      signals.push("/products.json");
    }
  }

  if (signals.length === 0) {
    throw new CrawlError(
      "not_shopify",
      `${final.hostname} doesn't look like a Shopify store. This tool only audits Shopify storefronts.`,
    );
  }

  return { origin: final.origin, url: res.url, html: res.text, signals };
}
