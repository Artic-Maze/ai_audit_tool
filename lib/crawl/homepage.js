import {
  absoluteUrl,
  jsonLdTypes,
  loadHtml,
  meta,
  scriptSrcs,
  shopifyGlobals,
} from "./html.js";

const MAX_LINKS = 5;

function findLinks($, base, test) {
  const found = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!test(href.toLowerCase(), text)) return;
    const url = absoluteUrl(href, base);
    if (url && new URL(url).origin === new URL(base).origin) found.add(url);
  });
  return [...found].slice(0, MAX_LINKS);
}

const NEWSLETTER_MARKERS = [
  [
    'form input[name="form_type"][value="customer"]',
    "Shopify newsletter form (form_type=customer)",
  ],
  [
    'input[name="contact[tags]"][value*="newsletter"]',
    "newsletter-tagged form",
  ],
  ['[class*="klaviyo-form"]', "Klaviyo embedded form"],
  [
    'form[class*="newsletter"], form[id*="newsletter"], [class*="newsletter"] input[type="email"]',
    "form marked as newsletter",
  ],
];

function newsletterForm($) {
  for (const [selector, evidence] of NEWSLETTER_MARKERS) {
    if ($(selector).length > 0) return { present: true, evidence };
  }
  return { present: false, evidence: null };
}

// The homepage HTML is already fetched by detectShopify, so this only parses.
export function parseHomepage(html, url) {
  const $ = loadHtml(html);
  return {
    url,
    title: $("title").first().text().trim() || null,
    metaDescription: meta($, "description"),
    og: {
      title: meta($, "og:title"),
      description: meta($, "og:description"),
      image: meta($, "og:image"),
      siteName: meta($, "og:site_name"),
    },
    jsonLdTypes: jsonLdTypes($),
    ...shopifyGlobals(html),
    scriptSrcs: scriptSrcs($, url),
    links: {
      faq: findLinks(
        $,
        url,
        (href, text) =>
          href.includes("faq") || /\bfaqs?\b|frequently asked/i.test(text),
      ),
      contact: findLinks(
        $,
        url,
        (href, text) =>
          href.includes("/pages/contact") || /^contact( us)?$/i.test(text),
      ),
    },
    newsletterForm: newsletterForm($),
    searchForm: $('form[action$="/search"]').length > 0,
  };
}
