import { loadHtml } from "./html.js";

// A query no store should match. Product links on its results page are nav,
// footer or "featured" links, so they're subtracted from real result pages.
const BASELINE_QUERY = "qzxjvkwpt";

const STOPWORDS = new Set(
  (
    "with from your this that pack size mini sale limited edition new " +
    "black white blue navy grey gray green pink purple brown beige cream " +
    "gold silver clear natural classic original premium women womens men " +
    "mens kids unisex small medium large xlarge bundle gift card sample " +
    "free shipping accessory accessories multi collection product item " +
    "other default"
  ).split(" "),
);

const SYNONYM_PAIRS = [
  ["sneaker", "trainer"],
  ["sneakers", "trainers"],
  ["hoodie", "sweatshirt"],
  ["hoodies", "sweatshirts"],
  ["sweater", "jumper"],
  ["sweaters", "jumpers"],
  ["pants", "trousers"],
  ["jacket", "coat"],
  ["jackets", "coats"],
  ["sofa", "couch"],
  ["backpack", "rucksack"],
  ["duvet", "comforter"],
  ["leggings", "tights"],
  ["sunglasses", "shades"],
  ["handbag", "purse"],
  ["moisturizer", "lotion"],
  ["blanket", "throw"],
  ["bottle", "flask"],
  ["beanie", "winter hat"],
  ["vitamins", "supplements"],
];

const SYNONYMS = new Map();
for (const [a, b] of SYNONYM_PAIRS) {
  if (!SYNONYMS.has(a)) SYNONYMS.set(a, b);
  if (!SYNONYMS.has(b)) SYNONYMS.set(b, a);
}

const tokenize = (text) => (text ?? "").toLowerCase().match(/\p{L}+/gu) ?? [];

// Swap two neighbouring letters near the middle: "jacket" -> "jakcet".
export function makeTypo(word) {
  const chars = [...word];
  const mid = Math.floor(chars.length / 2);
  for (const i of [mid - 1, mid, mid - 2, mid + 1]) {
    if (i >= 1 && i + 1 < chars.length && chars[i] !== chars[i + 1]) {
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      return chars.join("");
    }
  }
  return word.slice(0, -1);
}

export function togglePlural(word) {
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (/(ss|us|is)$/.test(word)) return `${word}es`;
  if (/s$/.test(word)) return word.slice(0, -1);
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(ch|sh|x|z)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

// The most common meaningful word across product titles, plus a typo of it
// and a synonym (or the plural/singular when no synonym is known). Words that
// name what a product is (they're in its own product type, like "Palette" or
// "Hoodie") win over adjectives and shade names shoppers rarely search for.
export function pickSearchTerms(products) {
  const inTitles = new Map();
  const inTitleAndType = new Map();
  const bump = (map, word) => map.set(word, (map.get(word) ?? 0) + 1);
  for (const p of products) {
    const typeWords = new Set(tokenize(p.productType));
    for (const word of new Set(tokenize(p.title))) {
      if (word.length < 4 || word.length > 12 || STOPWORDS.has(word)) continue;
      bump(inTitles, word);
      if (typeWords.has(word)) bump(inTitleAndType, word);
    }
  }
  // Words in nearly every title are usually the brand name.
  const ceiling = products.length >= 10 ? products.length * 0.8 : Infinity;
  const [word] =
    [...inTitles]
      .filter(([, n]) => n <= ceiling)
      .sort(
        ([a, na], [b, nb]) =>
          (inTitleAndType.get(b) ?? 0) - (inTitleAndType.get(a) ?? 0) ||
          nb - na ||
          a.localeCompare(b),
      )[0] ?? [];
  if (!word) return null;

  const synonym = SYNONYMS.get(word);
  return [
    { kind: "exact", query: word },
    { kind: "typo", query: makeTypo(word) },
    synonym
      ? { kind: "synonym", query: synonym }
      : { kind: "plural", query: togglePlural(word) },
  ];
}

function productHandles(html) {
  const $ = loadHtml(html);
  const handles = new Set();
  $('a[href*="/products/"]').each((_, el) => {
    const handle = $(el)
      .attr("href")
      .match(/\/products\/([^/?#.]+)/)?.[1];
    if (handle) handles.add(handle.toLowerCase());
  });
  return handles;
}

async function searchPageHandles(client, origin, query) {
  const res = await client.getHtml(
    `${origin}/search?q=${encodeURIComponent(query)}&type=product`,
  );
  return productHandles(res.text);
}

async function suggestCount(client, origin, query) {
  const params = new URLSearchParams({
    q: query,
    "resources[type]": "product",
    "resources[limit]": "10",
  });
  const data = await client.getJson(`${origin}/search/suggest.json?${params}`);
  const products = data?.resources?.results?.products;
  if (!Array.isArray(products)) {
    throw new Error("suggest.json returned an unexpected shape");
  }
  return products.length;
}

const settle = (promise) =>
  promise.then(
    (value) => ({ value, error: null }),
    (err) => ({ value: null, error: err.message }),
  );

export async function collectSearch(client, origin, products) {
  const terms = pickSearchTerms(products);
  if (!terms) {
    throw new Error("No usable words in product titles to test search with");
  }

  const [baseline, ...results] = await Promise.all([
    settle(searchPageHandles(client, origin, BASELINE_QUERY)),
    ...terms.map(({ query }) =>
      Promise.all([
        settle(searchPageHandles(client, origin, query)),
        settle(suggestCount(client, origin, query)),
      ]),
    ),
  ]);

  const queries = terms.map(({ kind, query }, i) => {
    const [page, suggest] = results[i];
    const pageCount =
      page.value && baseline.value
        ? [...page.value].filter((h) => !baseline.value.has(h)).length
        : null;
    return {
      kind,
      query,
      pageCount,
      pageError: pageCount === null ? (page.error ?? baseline.error) : null,
      suggestCount: suggest.value,
      suggestError: suggest.error,
    };
  });

  if (queries.every((q) => q.pageCount === null && q.suggestCount === null)) {
    throw new Error(queries[0].pageError ?? queries[0].suggestError);
  }

  // A method is only trustworthy if it finds the exact word. Search apps often
  // render results with JavaScript, leaving the HTML page empty while Shopify's
  // own suggest endpoint still answers (with its engine, not the app's).
  const [exact] = queries;
  const reliable = {
    page: exact.pageCount > 0,
    suggest: exact.suggestCount > 0,
  };
  return {
    baselineQuery: BASELINE_QUERY,
    baselineHandleCount: baseline.value?.size ?? null,
    queries,
    reliable,
    note:
      reliable.page || reliable.suggest
        ? null
        : "The exact-match query returned no results either, so search may be rendered by JavaScript. Typo and synonym results are inconclusive.",
  };
}
