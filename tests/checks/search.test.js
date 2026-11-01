import { describe, expect, it } from "vitest";
import {
  appsSection,
  makeSnapshot,
  searchSection,
} from "../fixtures/snapshot.js";
import { checkById } from "../helpers.js";

describe("search checks", () => {
  it("use the search page when it found the exact word", () => {
    const snapshot = makeSnapshot({
      search: searchSection({ page: [12, 0, 7] }),
    });
    const typo = checkById(snapshot, "search.typo-tolerance");
    expect(typo).toMatchObject({ passed: false, value: 0 });
    expect(typo.evidence).toEqual([
      'Searching "hoodie" returns 12 results on the search results page.',
      'The misspelling "hodoie" returns 0 results.',
    ]);
    expect(checkById(snapshot, "search.synonyms")).toMatchObject({
      passed: true,
      value: 7,
    });
  });

  it("fall back to Shopify's suggestions when no search app is installed", () => {
    const snapshot = makeSnapshot({
      search: searchSection({ page: [0, 0, 0], suggest: [10, 0, 10] }),
      apps: appsSection(["klaviyo"]),
    });
    const typo = checkById(snapshot, "search.typo-tolerance");
    expect(typo).toMatchObject({ passed: false, value: 0 });
    expect(typo.evidence[0]).toContain("in Shopify's search suggestions");
  });

  it("don't trust Shopify's suggestions when a search app replaces them", () => {
    const snapshot = makeSnapshot({
      search: searchSection({ page: [0, 0, 0], suggest: [10, 0, 10] }),
      apps: appsSection(["klevu"]),
    });
    const typo = checkById(snapshot, "search.typo-tolerance");
    expect(typo.passed).toBeNull();
    expect(typo.evidence[0]).toContain("Klevu renders them with JavaScript");
  });

  it("are unknown when neither method found the exact word", () => {
    const snapshot = makeSnapshot({
      search: searchSection({ page: [0, 0, 0], suggest: [0, 0, 0] }),
    });
    expect(checkById(snapshot, "search.typo-tolerance").passed).toBeNull();
    expect(checkById(snapshot, "search.synonyms").passed).toBeNull();
  });

  it("call a synonym query a related term", () => {
    const snapshot = makeSnapshot({
      search: searchSection({ variantKind: "synonym", page: [12, 4, 0] }),
    });
    expect(checkById(snapshot, "search.synonyms").evidence[1]).toBe(
      'The related term "sweatshirt" returns 0 results.',
    );
  });

  it("detect search apps and list what was looked for", () => {
    expect(
      checkById(makeSnapshot({ apps: appsSection(["algolia"]) }), "search.app"),
    ).toMatchObject({
      passed: true,
      display: "Algolia",
    });
    const none = checkById(
      makeSnapshot({ apps: appsSection([]) }),
      "search.app",
    );
    expect(none.passed).toBe(false);
    expect(none.evidence[0]).toMatch(
      /^No search app detected\. Looked for \d+ apps, including Searchanise, .+ and Doofinder\.$/,
    );
  });
});
