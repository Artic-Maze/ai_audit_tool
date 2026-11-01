import { describe, expect, it } from "vitest";
import {
  fivePages,
  makeSnapshot,
  ORIGIN,
  product,
  productPage,
  productPagesSection,
  products,
  productsSection,
  unavailable,
} from "../fixtures/snapshot.js";
import { checkById } from "../helpers.js";

const withProducts = (list, extra) =>
  makeSnapshot({ products: productsSection(list, extra) });

describe("copy.thin-descriptions", () => {
  const id = "copy.thin-descriptions";

  it("passes at exactly 20% thin and fails above it", () => {
    const at = withProducts(
      products(20, (i) => ({ descriptionWordCount: i < 4 ? 30 : 80 })),
    );
    const above = withProducts(
      products(20, (i) => ({ descriptionWordCount: i < 5 ? 30 : 80 })),
    );
    expect(checkById(at, id)).toMatchObject({ passed: true, value: 20 });
    expect(checkById(above, id)).toMatchObject({ passed: false, value: 25 });
  });

  it("counts 49 words as thin and 50 as enough", () => {
    const snapshot = withProducts([
      product("a", { descriptionWordCount: 49 }),
      product("b", { descriptionWordCount: 50 }),
    ]);
    expect(checkById(snapshot, id).value).toBe(50);
  });

  it("cites counts and the shortest descriptions", () => {
    const snapshot = withProducts([
      product("short", { title: "Short One", descriptionWordCount: 0 }),
      ...products(3),
    ]);
    expect(checkById(snapshot, id).evidence).toEqual([
      "1 of 4 products has a description under 50 words (25%).",
      "1 product has no description at all.",
      'Shortest: "Short One" (0 words).',
    ]);
  });

  it("leaves gift cards out and says so", () => {
    const snapshot = withProducts([
      ...products(4),
      product("gift-card", { title: "Gift Card", descriptionWordCount: 3 }),
    ]);
    const result = checkById(snapshot, id);
    expect(result.value).toBe(0);
    expect(result.evidence[0]).toContain("of 4 products (gift cards excluded)");
  });

  it("describes a sitemap sample as a sample", () => {
    const snapshot = withProducts(products(30), {
      source: "sitemap",
      catalogSize: 574,
    });
    expect(checkById(snapshot, id).evidence[0]).toContain(
      "of 30 products (sampled from 574 in the sitemap)",
    );
  });

  it("is unknown when product data is unavailable", () => {
    const snapshot = makeSnapshot({
      products: unavailable("HTTP 404 for /products.json"),
    });
    expect(checkById(snapshot, id)).toMatchObject({
      passed: null,
      value: null,
    });
  });
});

describe("copy.duplicate-descriptions", () => {
  const id = "copy.duplicate-descriptions";

  it("fails when more than 10% of described products share a description", () => {
    const snapshot = withProducts(
      products(20, (i) => ({ descriptionHash: i < 3 ? "same" : `hash-${i}` })),
    );
    const result = checkById(snapshot, id);
    expect(result).toMatchObject({ passed: false, value: 15 });
    expect(result.evidence[1]).toBe(
      '1 group of duplicates; the largest has 3 products, e.g. "product 1" and "product 2".',
    );
  });

  it("ignores products without a description", () => {
    const snapshot = withProducts(
      products(10, (i) =>
        i < 8 ? { descriptionHash: null, descriptionWordCount: 0 } : {},
      ),
    );
    expect(checkById(snapshot, id)).toMatchObject({ passed: true, value: 0 });
  });
});

describe("copy.image-alt-text", () => {
  const id = "copy.image-alt-text";

  it("measures only the products whose alt text was sampled", () => {
    const snapshot = withProducts(
      products(10, (i) =>
        i < 5
          ? { imageCount: 4, imagesMissingAlt: i === 0 ? 3 : 0 }
          : { imagesMissingAlt: null },
      ),
    );
    const result = checkById(snapshot, id);
    expect(result).toMatchObject({ passed: false, value: 15 });
    expect(result.evidence[0]).toBe(
      "3 of 20 images (15%) have no alt text, across 5 sampled products.",
    );
  });

  it("is unknown when no images were sampled", () => {
    const snapshot = withProducts(
      products(3, () => ({ imagesMissingAlt: null })),
    );
    expect(checkById(snapshot, id).passed).toBeNull();
  });
});

describe("copy.seo-meta", () => {
  const id = "copy.seo-meta";
  const weakPages = (count) =>
    fivePages((i) =>
      i < count ? { metaDescription: "Short.", metaDescriptionLength: 6 } : {},
    );

  it("allows one weak page in five but not two", () => {
    expect(
      checkById(makeSnapshot({ productPages: weakPages(1) }), id).passed,
    ).toBe(true);
    const result = checkById(makeSnapshot({ productPages: weakPages(2) }), id);
    expect(result.passed).toBe(false);
    expect(result.evidence).toContain(
      "/products/a: meta description is 6 characters.",
    );
  });

  it("ignores pages that failed to load", () => {
    const snapshot = makeSnapshot({
      productPages: productPagesSection([
        productPage("a"),
        {
          handle: "b",
          url: `${ORIGIN}/products/b`,
          status: "unavailable",
          error: "Timed out",
        },
      ]),
    });
    expect(checkById(snapshot, id).display).toBe("0 of 1 page");
  });
});

describe("copy.structured-data", () => {
  const id = "copy.structured-data";
  const missing = (count) =>
    fivePages((i) =>
      i < count ? { hasProductJsonLd: false, jsonLdTypes: [] } : {},
    );

  it("needs Product JSON-LD on at least 80% of sampled pages", () => {
    expect(
      checkById(makeSnapshot({ productPages: missing(1) }), id).passed,
    ).toBe(true);
    const result = checkById(makeSnapshot({ productPages: missing(2) }), id);
    expect(result.passed).toBe(false);
    expect(result.evidence[1]).toBe("Missing on /products/a, /products/b.");
  });
});
