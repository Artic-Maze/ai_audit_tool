import { htmlToText, wordCount } from "./html.js";

const LIMIT = 250;

export async function collectCollections(client, origin) {
  const data = await client.getJson(
    `${origin}/collections.json?limit=${LIMIT}`,
  );
  if (!Array.isArray(data?.collections)) {
    throw new Error("collections.json returned an unexpected shape");
  }
  return {
    count: data.collections.length,
    truncated: data.collections.length >= LIMIT,
    collections: data.collections.map((c) => ({
      handle: c.handle,
      title: c.title,
      productsCount: c.products_count ?? null,
      descriptionWordCount: wordCount(htmlToText(c.description)),
    })),
  };
}
