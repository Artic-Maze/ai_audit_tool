// Builders for synthetic StoreSnapshots. makeSnapshot() returns a complete,
// valid snapshot of a healthy store; pass sections to override any part.
import {
  APP_CATEGORIES,
  APP_FINGERPRINTS,
} from "../../lib/crawl/apps-fingerprints.js";

export const ORIGIN = "https://example-store.com";

const THEME = {
  name: "Dawn",
  schemaName: "Dawn",
  schemaVersion: "15.0.0",
  themeStoreId: 887,
};

export const ok = (data) => ({ status: "ok", data });
export const unavailable = (error) => ({ status: "unavailable", error });

let nextId = 1;

export function product(handle, overrides = {}) {
  return {
    id: nextId++,
    handle,
    title: handle.replace(/-/g, " "),
    vendor: "Example",
    productType: "Hoodie",
    tags: [],
    price: 40,
    variantCount: 2,
    descriptionText: "A soft, warm hoodie.",
    descriptionWordCount: 120,
    descriptionHash: `hash-${handle}`,
    imageCount: 4,
    imagesMissingAlt: 0,
    firstImage: null,
    createdAt: null,
    ...overrides,
  };
}

// product-1 … product-n; each(i) customises product i (0-based).
export function products(n, each = () => ({})) {
  return Array.from({ length: n }, (_, i) =>
    product(`product-${i + 1}`, each(i)),
  );
}

export function productsSection(list, overrides = {}) {
  return ok({
    source: "products.json",
    products: list,
    truncated: false,
    catalogSize: list.length,
    altSample: { requested: list.length, fetched: list.length },
    productsJsonError: null,
    ...overrides,
  });
}

const GOOD_TITLE = "Organic Cotton Hoodie – Example Store";
const GOOD_META =
  "A relaxed organic cotton hoodie with deep pockets, a lined hood and ribbed cuffs. Free returns.";

export function productPage(handle, overrides = {}) {
  return {
    handle,
    url: `${ORIGIN}/products/${handle}`,
    status: "ok",
    title: GOOD_TITLE,
    titleLength: GOOD_TITLE.length,
    metaDescription: GOOD_META,
    metaDescriptionLength: GOOD_META.length,
    jsonLdTypes: ["Offer", "Product"],
    hasProductJsonLd: true,
    hasRecommendations: true,
    recommendationsEvidence: "<product-recommendations> element",
    ...overrides,
  };
}

export const productPagesSection = (pages) => ok({ pages });

// Five product pages a–e; each(i) customises page i.
export const fivePages = (each = () => ({})) =>
  productPagesSection(
    ["a", "b", "c", "d", "e"].map((handle, i) => productPage(handle, each(i))),
  );

export function appsSection(ids) {
  const detected = ids.map((id) => {
    const app = APP_FINGERPRINTS.find((a) => a.id === id);
    if (!app) throw new Error(`Unknown app id ${id}`);
    return {
      id,
      name: app.name,
      categories: app.categories,
      evidence: `https://cdn.example.com/${id}.js`,
      foundOn: ORIGIN,
    };
  });
  return ok({
    detected,
    byCategory: Object.fromEntries(
      APP_CATEGORIES.map((category) => [
        category,
        detected
          .filter((a) => a.categories.includes(category))
          .map((a) => a.id),
      ]),
    ),
    pagesScanned: [ORIGIN],
  });
}

// Result counts as [exact, typo, variant] for each method; null = it failed.
export function searchSection({
  page = [12, 9, 11],
  suggest = [10, 8, 10],
  variantKind = "plural",
} = {}) {
  const terms = [
    ["exact", "hoodie"],
    ["typo", "hodoie"],
    variantKind === "synonym"
      ? ["synonym", "sweatshirt"]
      : ["plural", "hoodies"],
  ];
  const queries = terms.map(([kind, query], i) => ({
    kind,
    query,
    pageCount: page ? page[i] : null,
    pageError: page ? null : "HTTP 500 for /search",
    suggestCount: suggest ? suggest[i] : null,
    suggestError: suggest ? null : "HTTP 500 for /search/suggest.json",
  }));
  const reliable = { page: Boolean(page?.[0]), suggest: Boolean(suggest?.[0]) };
  return ok({
    baselineQuery: "qzxjvkwpt",
    baselineHandleCount: 4,
    queries,
    reliable,
    note:
      reliable.page || reliable.suggest
        ? null
        : "The exact-match query returned no results either, so search may be rendered by JavaScript. Typo and synonym results are inconclusive.",
  });
}

// true = linked from the homepage, false = missing, null = couldn't tell.
export function pagesSection({ faq = true, contact = true } = {}) {
  const page = (exists, path) =>
    exists === null
      ? {
          exists: null,
          via: null,
          url: null,
          error: "Blocked by bot protection",
        }
      : {
          exists,
          via: exists ? "homepage link" : null,
          url: exists ? `${ORIGIN}${path}` : null,
        };
  return ok({
    faq: page(faq, "/pages/faq"),
    contact: page(contact, "/pages/contact"),
  });
}

export function homepageSection({ newsletter = true, ...overrides } = {}) {
  return ok({
    url: `${ORIGIN}/`,
    title: "Example Store",
    metaDescription: "Organic cotton basics.",
    og: {
      title: "Example Store",
      description: null,
      image: null,
      siteName: "Example Store",
    },
    jsonLdTypes: ["Organization", "WebSite"],
    theme: THEME,
    myshopifyDomain: "example-store.myshopify.com",
    currency: "USD",
    locale: "en",
    scriptSrcs: [],
    links: {
      faq: [`${ORIGIN}/pages/faq`],
      contact: [`${ORIGIN}/pages/contact`],
    },
    newsletterForm: newsletter
      ? {
          present: true,
          evidence: "Shopify newsletter form (form_type=customer)",
        }
      : { present: false, evidence: null },
    searchForm: true,
    ...overrides,
  });
}

export function pagespeedRun(overrides = {}) {
  return {
    page: "homepage",
    url: `${ORIGIN}/`,
    strategy: "mobile",
    status: "ok",
    lab: {
      performanceScore: 72,
      lcpMs: 2300,
      cls: 0.04,
      tbtMs: 180,
      fcpMs: 1200,
    },
    field: {
      scope: "url",
      overall: "FAST",
      lcpMs: 1900,
      cls: 0.02,
      inpMs: 140,
    },
    ...overrides,
  };
}

export const pagespeedSection = (
  runs = [pagespeedRun(), pagespeedRun({ strategy: "desktop" })],
) => ok({ runs, keyed: false });

export function makeSnapshot(overrides = {}) {
  const { store, ...sections } = overrides;
  const list = products(20);
  return {
    version: 1,
    store: {
      inputUrl: "example-store.com",
      origin: ORIGIN,
      domain: "example-store.com",
      name: "Example Store",
      storefront: "theme",
      myshopifyDomain: "example-store.myshopify.com",
      theme: THEME,
      currency: "USD",
      detectedBy: ["Shopify.theme"],
      ...store,
    },
    crawl: {
      startedAt: "2026-11-01T08:00:00.000Z",
      durationMs: 21000,
      requestCount: 48,
      userAgent: "GrowthLensBot/0.1",
      options: { skipProductsJson: false, skipPageSpeed: false },
    },
    homepage: homepageSection(),
    products: productsSection(list),
    collections: ok({
      count: 2,
      truncated: false,
      collections: [
        {
          handle: "hoodies",
          title: "Hoodies",
          productsCount: 12,
          descriptionWordCount: 40,
        },
        {
          handle: "tees",
          title: "Tees",
          productsCount: 8,
          descriptionWordCount: 35,
        },
      ],
    }),
    productPages: productPagesSection(
      list.slice(0, 5).map((p) => productPage(p.handle)),
    ),
    pages: pagesSection(),
    apps: appsSection([
      "judgeme",
      "gorgias",
      "klaviyo",
      "privy",
      "searchanise",
      "rebuy",
    ]),
    search: searchSection(),
    pagespeed: pagespeedSection(),
    ...sections,
  };
}
