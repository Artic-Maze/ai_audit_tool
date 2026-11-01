import { detectApps } from "./apps.js";
import { collectCollections } from "./collections.js";
import { detectShopify } from "./detect.js";
import { parseHomepage } from "./homepage.js";
import { createHttpClient } from "./http.js";
import { collectPages } from "./pages.js";
import { collectPageSpeed } from "./pagespeed.js";
import { collectProductPages } from "./product-pages.js";
import { collectProducts } from "./products.js";
import { StoreSnapshot } from "./schema.js";
import { collectSearch } from "./search.js";

export { CrawlError } from "./errors.js";

// A failed collector marks its section unavailable instead of failing the crawl.
async function collect(fn) {
  try {
    return { status: "ok", data: await fn() };
  } catch (err) {
    return { status: "unavailable", error: err.message || String(err) };
  }
}

const unavailable = (error) => ({ status: "unavailable", error });

// Crawl a store's public storefront into a validated StoreSnapshot.
// Throws CrawlError when the site can't be audited at all (not Shopify,
// unreachable, blocked, password protected).
export async function crawlStore(
  inputUrl,
  {
    onProgress = () => {},
    skipProductsJson = false,
    skipPageSpeed = false,
  } = {},
) {
  const startedAt = new Date();
  const client = createHttpClient();

  onProgress("detecting");
  const site = await detectShopify(client, inputUrl);
  const homepage = parseHomepage(site.html, site.url);

  onProgress("products");
  const [products, collections, pages] = await Promise.all([
    collect(() => collectProducts(client, site.origin, { skipProductsJson })),
    collect(() => collectCollections(client, site.origin)),
    collect(() => collectPages(client, site.origin, homepage)),
  ]);
  const catalog = products.status === "ok" ? products.data.products : [];
  const noCatalog = unavailable("No product data to work from");

  onProgress("product_pages");
  let productDocs = [];
  const productPages = catalog.length
    ? await collect(async () => {
        const { pages, documents } = await collectProductPages(
          client,
          site.origin,
          catalog,
        );
        productDocs = documents;
        return { pages };
      })
    : noCatalog;

  // PageSpeed is slow, so it runs while search is being tested.
  const productUrl =
    productPages.status === "ok"
      ? (productPages.data.pages.find((p) => p.status === "ok")?.url ?? null)
      : null;
  const pagespeedRun = skipPageSpeed
    ? Promise.resolve(unavailable("Skipped"))
    : collect(() =>
        collectPageSpeed({ homepage: site.url, product: productUrl }),
      );

  onProgress("search");
  const search = catalog.length
    ? await collect(() => collectSearch(client, site.origin, catalog))
    : noCatalog;

  const apps = await collect(async () =>
    detectApps([
      { page: "homepage", url: site.url, html: site.html },
      ...productDocs,
    ]),
  );

  onProgress("pagespeed");
  const pagespeed = await pagespeedRun;

  return StoreSnapshot.parse({
    version: 1,
    store: {
      inputUrl,
      origin: site.origin,
      domain: new URL(site.origin).hostname,
      name: homepage.og.siteName ?? homepage.title,
      // Headless storefronts (Hydrogen, custom frontends) don't print
      // Shopify.theme and usually don't serve products.json or .js endpoints.
      storefront: homepage.theme ? "theme" : "headless",
      myshopifyDomain: homepage.myshopifyDomain,
      theme: homepage.theme,
      currency: homepage.currency,
      detectedBy: site.signals,
    },
    crawl: {
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      requestCount: client.requestCount,
      userAgent: client.userAgent,
      options: { skipProductsJson, skipPageSpeed },
    },
    homepage: { status: "ok", data: homepage },
    products,
    collections,
    productPages,
    pages,
    apps,
    search,
    pagespeed,
  });
}
