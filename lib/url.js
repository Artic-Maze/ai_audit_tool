const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

// Turn whatever the user typed ("store.com", "https://www.store.com/products/x")
// into "https://host". Returns null when it can't be a public store address.
// Shared by the landing form and the audit API, so keep it browser-safe.
export function normalizeStoreUrl(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // Needs a real domain: rejects localhost, bare IPs and IPv6 literals.
  if (!host.includes(".") || IPV4.test(host) || host.startsWith("[")) {
    return null;
  }

  return `https://${host}`;
}
