export const SYSTEM = `You write parts of an automated audit of a Shopify store's public storefront. The reader is the store's owner, and the audit looks for ways AI can grow their store: product copy, search, support, product recommendations, and email.

Ground rules:
- Use only the facts you're given. They come from a crawl of the public storefront and from rule-based checks. Never invent numbers, apps, pages, or product details.
- Write numbers exactly as they appear in the facts. Don't round, convert, or recompute them. Estimated lift ranges are the only exception.
- App and page detection is best-effort, so say "we didn't detect X" rather than "you don't have X".
- Write plain, direct US English for a busy owner, without hype or jargon.`;

const facts = (data) => `<facts>\n${JSON.stringify(data, null, 2)}\n</facts>`;

export function opportunitiesPrompt(data) {
  return `Explain each opportunity in the facts. The opportunities, their impact and effort, and the failed checks behind them were chosen by code: keep the same ids, and don't add, drop, or merge any.

For each opportunity:
- id: copied exactly.
- title: a short, specific action for this store, under 70 characters.
- finding: one or two sentences on what's wrong, citing the evidence figures exactly.
- recommendation: one or two sentences on the AI solution to build and what it would do for this store. Don't recommend anything listed under alreadyInPlace. If a relevant app was detected, build on it instead of suggesting a replacement.
- estLift: a conservative estimated range and what it applies to, such as "5–15% more conversions on affected product pages".

${facts(data)}`;
}

export function copyPrompt(data) {
  return `Rewrite each product description in the facts. These are the store's thinnest descriptions. Match the store's voice: the voice examples are its own longer descriptions.

For each product:
- handle: copied exactly.
- after: the new description, 80 to 150 words, in short paragraphs, optionally with a few bullet points (plain text, each line starting with "- "). Use only details found in the product's title, type, tags, price, or current description. Don't invent materials, sizes, ingredients, measurements, or claims; where a useful detail is missing, leave a placeholder in square brackets for the merchant, such as [material].
- whyBetter: one sentence on what the new version gives shoppers and search engines.

${facts(data)}`;
}

export function summaryPrompt(data) {
  return `Write an executive summary of this audit for the store owner: 3 or 4 sentences in one paragraph. Cover the overall result, the strongest area, and the biggest opportunities. Quote scores exactly as given, out of 100, but don't quote impact or effort ratings; describe timing in words if it helps. If an area couldn't be scored, say so in plain words, without technical details like file names or error codes, rather than guessing about it.

${facts(data)}`;
}
