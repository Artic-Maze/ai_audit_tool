import { describe, expect, it } from "vitest";
import { detectApps } from "../../lib/crawl/apps.js";
import { parseHomepage } from "../../lib/crawl/homepage.js";
import { htmlToText, textHash, wordCount } from "../../lib/crawl/html.js";
import { evenSample } from "../../lib/crawl/products.js";
import {
  makeTypo,
  pickSearchTerms,
  togglePlural,
} from "../../lib/crawl/search.js";

const URL = "https://example-store.com/";

describe("search terms", () => {
  it.each([
    ["jacket", "jakcet"],
    ["coffee", "cofefe"],
    ["brush", "bursh"],
  ])("misspell %s as %s", (word, typo) => {
    expect(makeTypo(word)).toBe(typo);
  });

  it.each([
    ["jacket", "jackets"],
    ["shoes", "shoe"],
    ["glass", "glasses"],
    ["candy", "candies"],
    ["boxes", "box"],
    ["brush", "brushes"],
  ])("switch %s to %s", (word, other) => {
    expect(togglePlural(word)).toBe(other);
  });

  it("prefer words that name a product type over common title words", () => {
    const terms = pickSearchTerms([
      { title: "Midnight Look Brush", productType: "Brush" },
      { title: "Dawn Look Brush", productType: "Brush" },
      { title: "Holiday Look Bundle", productType: "Bundle" },
      { title: "Summer Look Bundle", productType: "Bundle" },
      { title: "Winter Look Palette", productType: "Palette" },
    ]);
    expect(terms[0]).toEqual({ kind: "exact", query: "brush" });
  });

  it("use a known synonym when there is one", () => {
    const terms = pickSearchTerms([
      { title: "Zip Hoodie", productType: "Hoodie" },
      { title: "Pullover Hoodie", productType: "Hoodie" },
    ]);
    expect(terms).toEqual([
      { kind: "exact", query: "hoodie" },
      { kind: "typo", query: "hodoie" },
      { kind: "synonym", query: "sweatshirt" },
    ]);
  });
});

describe("text helpers", () => {
  it("keep words apart across tags and drop scripts", () => {
    expect(
      htmlToText("<p>Soft</p><p>cotton&nbsp;tee</p><script>x()</script>"),
    ).toBe("Soft cotton tee");
  });

  it("count words, not punctuation", () => {
    expect(wordCount("Soft — cotton tee!")).toBe(3);
  });

  it("hash descriptions alike when only case and punctuation differ", () => {
    expect(textHash("Soft, cotton tee!")).toBe(textHash("soft cotton TEE"));
    expect(textHash("")).toBeNull();
  });

  it("sample evenly and deterministically", () => {
    expect(evenSample([..."abcdefghij"], 3)).toEqual(["a", "d", "g"]);
  });
});

describe("detectApps", () => {
  it("finds apps by script URL, inline script and widget markup", () => {
    const html = `
      <script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script>
      <script>var urls = ["https://config.gorgias.chat/loader.js"];</script>
      <div class="jdgm-widget"></div>`;
    const ids = detectApps([{ page: "homepage", url: URL, html }]).detected.map(
      (a) => a.id,
    );
    expect(ids).toEqual(["judgeme", "gorgias", "klaviyo"]);
  });

  it("doesn't count Okendo loyalty as a reviews app", () => {
    const html =
      '<script src="https://cdn-static.okendo.io/loyalty/js/init-onsite.js"></script>';
    expect(detectApps([{ page: "homepage", url: URL, html }]).detected).toEqual(
      [],
    );
  });

  it("doesn't match brand names that are everyday words in product text", () => {
    const html = `<script>var product = {"description": "We'd gladly help you drift off"};</script>`;
    expect(detectApps([{ page: "homepage", url: URL, html }]).detected).toEqual(
      [],
    );
  });
});

describe("newsletter detection", () => {
  it("recognises a signup form by its id", () => {
    expect(
      parseHomepage('<form id="FooterSignupForm-1"></form>', URL)
        .newsletterForm,
    ).toEqual({
      present: true,
      evidence: "form marked as a signup form",
    });
  });

  it("ignores login forms", () => {
    const html = '<form action="/account/login"><input type="email"></form>';
    expect(parseHomepage(html, URL).newsletterForm.present).toBe(false);
  });
});
