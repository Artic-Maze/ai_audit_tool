import { compareText } from "../compare.js";
import { count, fmtInt, fmtPct, has, pct, quote, sum } from "./format.js";
import { pathOf, productPages, sectionData, unknown } from "./helpers.js";

export const THIN_WORDS = 50;
export const MAX_THIN_SHARE = 20;
export const MAX_DUPLICATE_SHARE = 10;
export const MAX_MISSING_ALT_SHARE = 10;
export const MIN_TITLE_CHARS = 20;
export const MIN_META_CHARS = 50;
export const MAX_WEAK_SEO_SHARE = 20;
export const MIN_STRUCTURED_DATA_SHARE = 80;

const GIFT_CARD = /gift\s*card/i;

// The products the copy checks judge. Gift cards are left out: their copy
// rarely matters and they'd skew the numbers. `scope` says what the counts
// cover, so evidence never overstates them.
function catalog(snapshot) {
  const data = sectionData(snapshot.products);
  if (!data) {
    return {
      error: `Product data couldn't be collected (${snapshot.products.error}).`,
    };
  }
  const products = data.products.filter(
    (p) => !GIFT_CARD.test(p.title) && !GIFT_CARD.test(p.productType ?? ""),
  );
  if (products.length === 0) {
    return { error: "There are no products to check." };
  }

  const notes = [];
  if (data.source === "sitemap") {
    notes.push(`sampled from ${fmtInt(data.catalogSize)} in the sitemap`);
  }
  if (data.truncated) {
    notes.push(`the first ${fmtInt(data.products.length)} in the catalog`);
  }
  if (data.products.length > products.length) notes.push("gift cards excluded");
  return { products, scope: notes.length ? ` (${notes.join("; ")})` : "" };
}

const thinDescriptions = {
  id: "copy.thin-descriptions",
  area: "copy",
  title: "Thin product descriptions",
  metric: `Share of products with descriptions under ${THIN_WORDS} words`,
  threshold: `${MAX_THIN_SHARE}% or less`,
  run(snapshot) {
    const { products, scope, error } = catalog(snapshot);
    if (error) return unknown(error);
    const thin = products.filter((p) => p.descriptionWordCount < THIN_WORDS);
    const share = pct(thin.length, products.length);
    const empty = thin.filter((p) => p.descriptionWordCount === 0).length;
    const shortest = [...thin]
      .sort(
        (a, b) =>
          a.descriptionWordCount - b.descriptionWordCount ||
          compareText(a.handle, b.handle),
      )
      .slice(0, 3);

    const evidence = [
      `${fmtInt(thin.length)} of ${count(products.length, "product")}${scope} ${has(thin.length)} a description under ${THIN_WORDS} words (${fmtPct(share)}).`,
    ];
    if (empty) {
      evidence.push(
        `${count(empty, "product")} ${has(empty)} no description at all.`,
      );
    }
    if (shortest.length) {
      const list = shortest.map(
        (p) => `${quote(p.title)} (${count(p.descriptionWordCount, "word")})`,
      );
      evidence.push(`Shortest: ${list.join(", ")}.`);
    }
    return {
      passed: share <= MAX_THIN_SHARE,
      value: share,
      display: fmtPct(share),
      evidence,
    };
  },
};

const duplicateDescriptions = {
  id: "copy.duplicate-descriptions",
  area: "copy",
  title: "Duplicate product descriptions",
  metric: "Share of described products whose description matches another's",
  threshold: `${MAX_DUPLICATE_SHARE}% or less`,
  run(snapshot) {
    const { products, scope, error } = catalog(snapshot);
    if (error) return unknown(error);
    const described = products.filter((p) => p.descriptionHash);
    if (described.length < 2) {
      return unknown("Fewer than two products have descriptions to compare.");
    }

    const groups = new Map();
    for (const p of described) {
      if (!groups.has(p.descriptionHash)) groups.set(p.descriptionHash, []);
      groups.get(p.descriptionHash).push(p);
    }
    const duplicates = [...groups.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.sort((a, b) => compareText(a.handle, b.handle)))
      .sort(
        (a, b) => b.length - a.length || compareText(a[0].handle, b[0].handle),
      );
    const affected = sum(duplicates.map((group) => group.length));
    const share = pct(affected, described.length);

    const evidence = [
      `${fmtInt(affected)} of ${count(described.length, "product")} with descriptions${scope} share their description with another product, ignoring case and punctuation (${fmtPct(share)}).`,
    ];
    if (duplicates.length) {
      const [largest] = duplicates;
      evidence.push(
        `${count(duplicates.length, "group")} of duplicates; the largest has ${count(largest.length, "product")}, e.g. ${quote(largest[0].title)} and ${quote(largest[1].title)}.`,
      );
    }
    return {
      passed: share <= MAX_DUPLICATE_SHARE,
      value: share,
      display: fmtPct(share),
      evidence,
    };
  },
};

const imageAltText = {
  id: "copy.image-alt-text",
  area: "copy",
  title: "Missing image alt text",
  metric: "Share of product images without alt text, from a sample of products",
  threshold: `${MAX_MISSING_ALT_SHARE}% or less`,
  run(snapshot) {
    const { products, error } = catalog(snapshot);
    if (error) return unknown(error);
    // Alt text is only known for products whose .js endpoint was sampled.
    const sampled = products.filter(
      (p) => p.imagesMissingAlt !== null && p.imageCount > 0,
    );
    const images = sum(sampled.map((p) => p.imageCount));
    if (images === 0) {
      return unknown("No product images could be checked for alt text.");
    }
    const missing = sum(sampled.map((p) => p.imagesMissingAlt));
    const share = pct(missing, images);
    const worst = sampled
      .filter((p) => p.imagesMissingAlt > 0)
      .sort(
        (a, b) =>
          b.imagesMissingAlt - a.imagesMissingAlt ||
          compareText(a.handle, b.handle),
      )
      .slice(0, 3);

    const evidence = [
      `${fmtInt(missing)} of ${count(images, "image")} (${fmtPct(share)}) ${has(missing)} no alt text, across ${count(sampled.length, "sampled product")}.`,
    ];
    if (worst.length) {
      const list = worst.map(
        (p) => `${quote(p.title)} (${p.imagesMissingAlt} of ${p.imageCount})`,
      );
      evidence.push(`Most affected: ${list.join(", ")}.`);
    }
    return {
      passed: share <= MAX_MISSING_ALT_SHARE,
      value: share,
      display: fmtPct(share),
      evidence,
    };
  },
};

function seoIssues(page) {
  const issues = [];
  if (!page.title) issues.push("no title");
  else if (page.titleLength < MIN_TITLE_CHARS) {
    issues.push(`title is ${page.titleLength} characters`);
  }
  if (!page.metaDescription) issues.push("no meta description");
  else if (page.metaDescriptionLength < MIN_META_CHARS) {
    issues.push(`meta description is ${page.metaDescriptionLength} characters`);
  }
  return issues;
}

const seoMeta = {
  id: "copy.seo-meta",
  area: "copy",
  title: "Weak SEO titles or meta descriptions",
  metric: `Share of sampled product pages with a title under ${MIN_TITLE_CHARS} characters or a meta description under ${MIN_META_CHARS}`,
  threshold: `${MAX_WEAK_SEO_SHARE}% or less`,
  run(snapshot) {
    const { pages, error } = productPages(snapshot);
    if (error) return unknown(error);
    const weak = pages
      .map((page) => ({ page, issues: seoIssues(page) }))
      .filter(({ issues }) => issues.length > 0);
    const share = pct(weak.length, pages.length);
    return {
      passed: share <= MAX_WEAK_SEO_SHARE,
      value: share,
      display: `${weak.length} of ${count(pages.length, "page")}`,
      evidence: [
        `${weak.length} of ${count(pages.length, "sampled product page")} ${has(weak.length)} a missing or short SEO title or meta description.`,
        ...weak.map(
          ({ page, issues }) => `${pathOf(page.url)}: ${issues.join(", ")}.`,
        ),
      ],
    };
  },
};

const structuredData = {
  id: "copy.structured-data",
  area: "copy",
  title: "Product structured data",
  metric: "Share of sampled product pages with Product JSON-LD",
  threshold: `${MIN_STRUCTURED_DATA_SHARE}% or more`,
  run(snapshot) {
    const { pages, error } = productPages(snapshot);
    if (error) return unknown(error);
    const missing = pages.filter((p) => !p.hasProductJsonLd);
    const found = pages.length - missing.length;
    const share = pct(found, pages.length);
    const evidence = [
      `Product structured data (JSON-LD) found on ${found} of ${count(pages.length, "sampled product page")}.`,
    ];
    if (missing.length) {
      evidence.push(
        `Missing on ${missing.map((p) => pathOf(p.url)).join(", ")}.`,
      );
    }
    return {
      passed: share >= MIN_STRUCTURED_DATA_SHARE,
      value: share,
      display: `${found} of ${count(pages.length, "page")}`,
      evidence,
    };
  },
};

export const COPY_CHECKS = [
  thinDescriptions,
  duplicateDescriptions,
  imageAltText,
  seoMeta,
  structuredData,
];
