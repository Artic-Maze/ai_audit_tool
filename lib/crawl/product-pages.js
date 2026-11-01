import { evenSample } from "./products.js";
import { jsonLdTypes, loadHtml, meta } from "./html.js";

const SAMPLE_SIZE = 5;

const RECOMMENDATION_HEADING =
  /you may also like|you might also like|related products|frequently bought together|customers also (bought|viewed)|complete the look|pairs well with|recommended for you/i;

function recommendations($) {
  if ($("product-recommendations").length > 0) {
    return "<product-recommendations> element";
  }
  if ($('[data-url*="/recommendations/products"]').length > 0) {
    return "section loading /recommendations/products";
  }
  if (
    $('[class*="product-recommendations"], [id*="product-recommendations"]')
      .length > 0
  ) {
    return "product-recommendations section";
  }
  let heading = null;
  $("h2, h3, h4").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 60 && RECOMMENDATION_HEADING.test(text)) {
      heading = `heading "${text}"`;
      return false;
    }
  });
  return heading;
}

function parseProductPage(html, url, handle) {
  const $ = loadHtml(html);
  const title = $("title").first().text().replace(/\s+/g, " ").trim() || null;
  const metaDescription = meta($, "description");
  const types = jsonLdTypes($);
  const recs = recommendations($);
  return {
    handle,
    url,
    status: "ok",
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    jsonLdTypes: types,
    hasProductJsonLd:
      types.includes("Product") || types.includes("ProductGroup"),
    hasRecommendations: recs !== null,
    recommendationsEvidence: recs,
  };
}

// Fetch a few product pages for the things products.json can't tell us: SEO
// title and meta description, JSON-LD, and related-product sections. The raw
// HTML is returned separately for app detection and kept out of the snapshot.
export async function collectProductPages(client, origin, products) {
  const handles = evenSample(products.map((p) => p.handle).sort(), SAMPLE_SIZE);
  const results = await Promise.all(
    handles.map(async (handle) => {
      const url = `${origin}/products/${encodeURIComponent(handle)}`;
      try {
        const res = await client.getHtml(url);
        return {
          page: parseProductPage(res.text, res.url, handle),
          document: { page: "product", url: res.url, html: res.text },
        };
      } catch (err) {
        return {
          page: { handle, url, status: "unavailable", error: err.message },
        };
      }
    }),
  );
  const pages = results.map((r) => r.page);
  if (pages.length > 0 && pages.every((p) => p.status !== "ok")) {
    throw new Error(`No product pages could be fetched (${pages[0].error})`);
  }
  return { pages, documents: results.flatMap((r) => r.document ?? []) };
}
