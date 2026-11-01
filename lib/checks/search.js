import { count } from "./format.js";
import {
  appCheck,
  appsIn,
  joinNames,
  sectionData,
  unknown,
} from "./helpers.js";

const VARIANT_LABELS = {
  typo: "misspelling",
  synonym: "related term",
  plural: "plural/singular form",
};

// Which result counts reflect what shoppers see. The search page's HTML wins
// when it found the exact word. Shopify's suggest endpoint only stands in when
// no search app is installed, because an app replaces Shopify's engine.
function measurement(snapshot) {
  const search = sectionData(snapshot.search);
  if (!search) {
    return { error: `Search couldn't be tested (${snapshot.search.error}).` };
  }
  if (search.reliable.page) {
    return {
      search,
      key: "pageCount",
      errorKey: "pageError",
      where: "on the search results page",
    };
  }
  if (!search.reliable.suggest) {
    return { error: search.note ?? "Search results couldn't be read." };
  }
  const { apps, error } = appsIn(snapshot, "search");
  if (error) return { error };
  if (apps.length > 0) {
    return {
      error: `The search page's HTML lists no results, likely because ${joinNames(apps)} ${apps.length === 1 ? "renders" : "render"} them with JavaScript, so this couldn't be measured.`,
    };
  }
  return {
    search,
    key: "suggestCount",
    errorKey: "suggestError",
    where: "in Shopify's search suggestions (which list at most 10)",
  };
}

// Passes when the variant query (a typo, synonym or plural of a word from the
// catalog) still finds products.
function variantCheck(kinds) {
  return (snapshot) => {
    const m = measurement(snapshot);
    if (m.error) return unknown(m.error);
    const exact = m.search.queries.find((q) => q.kind === "exact");
    const variant = m.search.queries.find((q) => kinds.includes(q.kind));
    if (!variant) return unknown("This query wasn't run.");
    const label = VARIANT_LABELS[variant.kind];
    const results = variant[m.key];
    if (results === null) {
      return unknown(
        `The ${label} "${variant.query}" couldn't be searched (${variant[m.errorKey]}).`,
      );
    }
    return {
      passed: results > 0,
      value: results,
      display: count(results, "result"),
      evidence: [
        `Searching "${exact.query}" returns ${count(exact[m.key], "result")} ${m.where}.`,
        `The ${label} "${variant.query}" returns ${count(results, "result")}.`,
      ],
    };
  };
}

export const SEARCH_CHECKS = [
  {
    id: "search.typo-tolerance",
    area: "search",
    title: "Typo tolerance",
    metric: "Results for a misspelled word from the catalog",
    threshold: "At least 1 result",
    run: variantCheck(["typo"]),
  },
  {
    id: "search.synonyms",
    area: "search",
    title: "Synonyms and plurals",
    metric: "Results for a synonym or plural of a word from the catalog",
    threshold: "At least 1 result",
    run: variantCheck(["synonym", "plural"]),
  },
  {
    id: "search.app",
    area: "search",
    title: "Search app",
    metric: "Search app detected",
    threshold: "Detected",
    run: appCheck("search", "search app"),
  },
];
