// FAQ and contact pages: a homepage link counts; otherwise try Shopify's
// default handle. `exists` is null when we couldn't tell (blocked, timeout).
async function findPage(client, origin, links, path) {
  if (links.length > 0) {
    return { exists: true, via: "homepage link", url: links[0] };
  }
  try {
    const res = await client.get(`${origin}${path}`);
    if (res.blocked) {
      return {
        exists: null,
        via: null,
        url: null,
        error: "Blocked by bot protection",
      };
    }
    // Some stores redirect missing pages to the homepage, so check where we landed.
    const landed = new URL(res.url).pathname.replace(/\/$/, "");
    const exists = res.ok && landed === path;
    return { exists, via: exists ? path : null, url: exists ? res.url : null };
  } catch (err) {
    return { exists: null, via: null, url: null, error: err.message };
  }
}

export async function collectPages(client, origin, homepage) {
  const [faq, contact] = await Promise.all([
    findPage(client, origin, homepage.links.faq, "/pages/faq"),
    findPage(client, origin, homepage.links.contact, "/pages/contact"),
  ]);
  return { faq, contact };
}
