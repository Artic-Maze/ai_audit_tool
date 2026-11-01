import {
  appsSection,
  fivePages,
  homepageSection,
  makeSnapshot,
  pagesSection,
  pagespeedRun,
  pagespeedSection,
  products,
  productsSection,
  searchSection,
  unavailable,
} from "./snapshot.js";

// Passes every scored check.
export const strongStore = makeSnapshot();

// Fails nearly everything: thin, duplicated copy, no apps, broken search.
export const weakStore = makeSnapshot({
  products: productsSection(
    products(20, (i) => ({
      descriptionWordCount: i < 15 ? 12 : 90,
      descriptionHash: i < 6 ? "same-description" : `hash-${i}`,
      imagesMissingAlt: 3,
    })),
  ),
  productPages: fivePages(() => ({
    metaDescription: null,
    metaDescriptionLength: 0,
    jsonLdTypes: [],
    hasProductJsonLd: false,
    hasRecommendations: false,
    recommendationsEvidence: null,
  })),
  pages: pagesSection({ faq: false }),
  apps: appsSection([]),
  search: searchSection({ page: [12, 0, 0] }),
  homepage: homepageSection({ newsletter: false }),
  pagespeed: pagespeedSection([
    pagespeedRun({
      lab: {
        performanceScore: 28,
        lcpMs: 7400,
        cls: 0.31,
        tbtMs: 2100,
        fcpMs: 3900,
      },
      field: null,
    }),
  ]),
});

// A headless storefront: no product data, so most checks can't be measured.
export const headlessStore = makeSnapshot({
  store: { storefront: "headless", theme: null },
  homepage: homepageSection({ newsletter: false, theme: null }),
  products: unavailable(
    "products.json unavailable (HTTP 404 for /products.json) and no products found in sitemap.xml",
  ),
  collections: unavailable("HTTP 404 for /collections.json"),
  productPages: unavailable("No product data to work from"),
  search: unavailable("No product data to work from"),
  apps: appsSection(["klaviyo"]),
});
