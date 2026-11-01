import { z } from "zod";
import { APP_CATEGORIES } from "./apps-fingerprints.js";

const str = z.string();
const nstr = z.string().nullable();
const int = z.number().int().nonnegative();
const nint = int.nullable();
const nnum = z.number().nullable();

// Every collector's output is either its data or the reason it's missing.
const unavailable = z.object({ status: z.literal("unavailable"), error: str });
const section = (data) =>
  z.discriminatedUnion("status", [
    z.object({ status: z.literal("ok"), data }),
    unavailable,
  ]);

const Theme = z.object({
  name: nstr,
  schemaName: nstr,
  schemaVersion: nstr,
  themeStoreId: z.number().int().nullable(),
});

const Homepage = z.object({
  url: str,
  title: nstr,
  metaDescription: nstr,
  og: z.object({
    title: nstr,
    description: nstr,
    image: nstr,
    siteName: nstr,
  }),
  jsonLdTypes: z.array(str),
  theme: Theme.nullable(),
  myshopifyDomain: nstr,
  currency: nstr,
  locale: nstr,
  scriptSrcs: z.array(str),
  links: z.object({ faq: z.array(str), contact: z.array(str) }),
  newsletterForm: z.object({ present: z.boolean(), evidence: nstr }),
  searchForm: z.boolean(),
});

export const Product = z.object({
  id: z.number().int(),
  handle: str,
  title: str,
  vendor: nstr,
  productType: nstr,
  tags: z.array(str),
  price: z.number().nonnegative().nullable(),
  variantCount: int,
  descriptionText: z.string(),
  descriptionWordCount: int,
  descriptionHash: nstr,
  imageCount: int,
  imagesMissingAlt: nint,
  firstImage: nstr,
  createdAt: nstr,
});

const Products = z.object({
  source: z.enum(["products.json", "sitemap"]),
  products: z.array(Product),
  truncated: z.boolean(),
  catalogSize: nint,
  altSample: z.object({ requested: int, fetched: int }),
  productsJsonError: nstr,
});

const Collections = z.object({
  count: int,
  truncated: z.boolean(),
  collections: z.array(
    z.object({
      handle: str,
      title: str,
      productsCount: nint,
      descriptionWordCount: int,
    }),
  ),
});

const ProductPage = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    handle: str,
    url: str,
    title: nstr,
    titleLength: int,
    metaDescription: nstr,
    metaDescriptionLength: int,
    jsonLdTypes: z.array(str),
    hasProductJsonLd: z.boolean(),
    hasRecommendations: z.boolean(),
    recommendationsEvidence: nstr,
  }),
  z.object({
    status: z.literal("unavailable"),
    handle: str,
    url: str,
    error: str,
  }),
]);

const PageCheck = z.object({
  exists: z.boolean().nullable(),
  via: nstr,
  url: nstr,
  error: str.optional(),
});

const Category = z.enum(APP_CATEGORIES);

const Apps = z.object({
  detected: z.array(
    z.object({
      id: str,
      name: str,
      categories: z.array(Category),
      evidence: str,
      foundOn: str,
    }),
  ),
  byCategory: z.record(Category, z.array(str)),
  pagesScanned: z.array(str),
});

const Search = z.object({
  baselineQuery: str,
  baselineHandleCount: nint,
  queries: z.array(
    z.object({
      kind: z.enum(["exact", "typo", "plural", "synonym"]),
      query: str,
      pageCount: nint,
      pageError: nstr,
      suggestCount: nint,
      suggestError: nstr,
    }),
  ),
  reliable: z.object({ page: z.boolean(), suggest: z.boolean() }),
  note: nstr,
});

const RunTarget = {
  page: z.enum(["homepage", "product"]),
  url: str,
  strategy: z.enum(["mobile", "desktop"]),
};

const PageSpeedRun = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    ...RunTarget,
    lab: z.object({
      performanceScore: nint,
      lcpMs: nnum,
      cls: nnum,
      tbtMs: nnum,
      fcpMs: nnum,
    }),
    field: z
      .object({
        scope: z.enum(["url", "origin"]),
        overall: nstr,
        lcpMs: nnum,
        cls: nnum,
        inpMs: nnum,
      })
      .nullable(),
  }),
  z.object({ status: z.literal("unavailable"), ...RunTarget, error: str }),
]);

export const PageSpeedSection = section(
  z.object({ runs: z.array(PageSpeedRun), keyed: z.boolean() }),
);

export const StoreSnapshot = z.object({
  version: z.literal(1),
  store: z.object({
    inputUrl: str,
    origin: str,
    domain: str,
    name: nstr,
    storefront: z.enum(["theme", "headless"]),
    myshopifyDomain: nstr,
    theme: Theme.nullable(),
    currency: nstr,
    detectedBy: z.array(str),
  }),
  crawl: z.object({
    startedAt: z.iso.datetime(),
    durationMs: int,
    requestCount: int,
    userAgent: str,
    options: z.object({
      skipProductsJson: z.boolean(),
      skipPageSpeed: z.boolean(),
    }),
  }),
  homepage: section(Homepage),
  products: section(Products),
  collections: section(Collections),
  productPages: section(z.object({ pages: z.array(ProductPage) })),
  pages: section(z.object({ faq: PageCheck, contact: PageCheck })),
  apps: section(Apps),
  search: section(Search),
  pagespeed: PageSpeedSection,
});
