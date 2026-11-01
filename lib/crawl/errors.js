// A crawl failure to show the user as-is (not a bug). `code` lets the API and
// UI react without parsing the message.
export class CrawlError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CrawlError";
    this.code = code;
  }
}

// The store's bot protection answered instead of the real page. Collectors
// throw this so the data is marked unavailable instead of read as empty.
export class BlockedError extends Error {
  constructor(url) {
    super(`Blocked by the store's bot protection (${new URL(url).pathname})`);
    this.name = "BlockedError";
  }
}
