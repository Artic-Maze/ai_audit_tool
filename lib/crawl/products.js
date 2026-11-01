import { htmlToText, textHash, wordCount } from "./html.js";

const PAGE_LIMIT = 250;
const MAX_PAGES = 4;
const SAMPLE_SIZE = 30;
const MAX_SITEMAPS = 2;
const MAX_DESCRIPTION_CHARS = 2000;

// Evenly spaced picks, so the same catalog always yields the same sample.
export function evenSample(items, n) {
  if (items.length <= n) return items;
  return Array.from(
    { length: n },
    (_, i) => items[Math.floor((i * items.length) / n)],
  );
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function description(html) {
  const text = htmlToText(html);
  return {
    descriptionText: text.slice(0, MAX_DESCRIPTION_CHARS),
    descriptionWordCount: wordCount(text),
    descriptionHash: textHash(text),
  };
}

const minOrNull = (values) => {
  const nums = values.filter((v) => Number.isFinite(v));
  return nums.length ? Math.min(...nums) : null;
};

function fromProductsJson(p) {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    vendor: p.vendor || null,
    productType: p.product_type || null,
    tags: parseTags(p.tags),
    price: minOrNull((p.variants ?? []).map((v) => parseFloat(v.price))),
    variantCount: p.variants?.length ?? 0,
    ...description(p.body_html),
    imageCount: p.images?.length ?? 0,
    // products.json doesn't expose alt text; filled in from the .js sample.
    imagesMissingAlt: null,
    firstImage: p.images?.[0]?.src ?? null,
    createdAt: p.created_at ?? null,
  };
}

function imageAlt(js) {
  const images = (js.media ?? []).filter((m) => m.media_type === "image");
  if (images.length === 0) {
    return { imageCount: js.images?.length ?? 0, missing: null };
  }
  return {
    imageCount: images.length,
    missing: images.filter((m) => !m.alt?.trim()).length,
  };
}

function fromProductJs(js) {
  const { imageCount, missing } = imageAlt(js);
  const firstImage = js.featured_image ?? js.images?.[0] ?? null;
  return {
    id: js.id,
    handle: js.handle,
    title: js.title,
    vendor: js.vendor || null,
    productType: js.type || null,
    tags: parseTags(js.tags),
    // .js prices are in cents.
    price: Number.isFinite(js.price_min ?? js.price)
      ? (js.price_min ?? js.price) / 100
      : null,
    variantCount: js.variants?.length ?? 0,
    ...description(js.description),
    imageCount,
    imagesMissingAlt: missing,
    firstImage: firstImage?.startsWith("//")
      ? `https:${firstImage}`
      : firstImage,
    createdAt: js.created_at ?? null,
  };
}

async function fetchProductsJson(client, origin) {
  const byHandle = new Map();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let data;
    try {
      data = await client.getJson(
        `${origin}/products.json?limit=${PAGE_LIMIT}&page=${page}`,
      );
    } catch (err) {
      // Keep what earlier pages returned rather than losing everything.
      if (page > 1) {
        return { products: [...byHandle.values()], truncated: true };
      }
      throw err;
    }
    if (!Array.isArray(data?.products)) {
      throw new Error("products.json returned an unexpected shape");
    }
    for (const p of data.products) byHandle.set(p.handle, fromProductsJson(p));
    if (data.products.length < PAGE_LIMIT) {
      return { products: [...byHandle.values()], truncated: false };
    }
  }
  return { products: [...byHandle.values()], truncated: true };
}

function fetchProductJs(client, origin, handles) {
  return Promise.all(
    handles.map((handle) =>
      client
        .getJson(`${origin}/products/${encodeURIComponent(handle)}.js`)
        .then((js) => ({ handle, js }))
        .catch((err) => ({ handle, error: err.message })),
    ),
  );
}

const LOC = /<loc>\s*([^<\s]+)\s*<\/loc>/g;

async function handlesFromSitemap(client, origin) {
  const index = await client.getHtml(`${origin}/sitemap.xml`);
  const sitemaps = [...index.text.matchAll(LOC)]
    .map((m) => m[1])
    .filter((loc) => {
      try {
        return new URL(loc).pathname.startsWith("/sitemap_products");
      } catch {
        return false;
      }
    })
    .slice(0, MAX_SITEMAPS);

  const handles = new Set();
  for (const sitemap of sitemaps) {
    const res = await client.getHtml(sitemap);
    for (const [, loc] of res.text.matchAll(LOC)) {
      const handle = loc.match(/\/products\/([^/?#]+)/)?.[1];
      if (handle) handles.add(decodeURIComponent(handle));
    }
  }
  return [...handles].sort();
}

export async function collectProducts(
  client,
  origin,
  { skipProductsJson = false } = {},
) {
  let productsJsonError = skipProductsJson ? "skipped" : null;
  let catalog = null;
  if (!skipProductsJson) {
    try {
      catalog = await fetchProductsJson(client, origin);
      if (catalog.products.length === 0) {
        catalog = null;
        productsJsonError = "products.json returned no products";
      }
    } catch (err) {
      productsJsonError = err.message;
    }
  }

  if (catalog) {
    const sample = evenSample(
      catalog.products.map((p) => p.handle),
      SAMPLE_SIZE,
    );
    const details = await fetchProductJs(client, origin, sample);
    const byHandle = new Map(catalog.products.map((p) => [p.handle, p]));
    let fetched = 0;
    for (const { handle, js } of details) {
      const product = byHandle.get(handle);
      if (!js || !product) continue;
      const { imageCount, missing } = imageAlt(js);
      product.imageCount = imageCount;
      product.imagesMissingAlt = missing;
      fetched++;
    }
    return {
      source: "products.json",
      products: catalog.products,
      truncated: catalog.truncated,
      catalogSize: catalog.truncated ? null : catalog.products.length,
      altSample: { requested: sample.length, fetched },
      productsJsonError: null,
    };
  }

  // Fallback when products.json is blocked: sample handles from the sitemap
  // and read each product's .js endpoint.
  const handles = await handlesFromSitemap(client, origin);
  if (handles.length === 0) {
    throw new Error(
      `products.json unavailable (${productsJsonError}) and no products found in sitemap.xml`,
    );
  }
  const sample = evenSample(handles, SAMPLE_SIZE);
  const details = await fetchProductJs(client, origin, sample);
  const sampled = details.filter((d) => d.js).map((d) => fromProductJs(d.js));
  if (sampled.length === 0) {
    throw new Error(
      `products.json unavailable (${productsJsonError}) and product .js fetches failed (${details[0]?.error})`,
    );
  }
  return {
    source: "sitemap",
    products: sampled,
    truncated: false,
    catalogSize: handles.length,
    altSample: { requested: sample.length, fetched: sampled.length },
    productsJsonError,
  };
}
