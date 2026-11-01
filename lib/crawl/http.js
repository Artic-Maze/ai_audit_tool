import pLimit from "p-limit";
import { BlockedError, CrawlError } from "./errors.js";
import { assertPublicHost } from "./net.js";

const MAX_REDIRECTS = 5;
const RETRYABLE = new Set([429, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function userAgent() {
  const contact = process.env.APP_URL;
  return `GrowthLensBot/0.1${contact ? ` (+${contact})` : ""}`;
}

// Cloudflare/Shopify bot challenges come back as 429/403 with an interstitial
// page. Retrying doesn't help, and the body must never be read as real data.
function isChallenge(res, text) {
  if (res.headers.get("cf-mitigated") === "challenge") return true;
  if (res.status !== 429 && res.status !== 403) return false;
  return /verifying your connection|challenge-platform|captcha/i.test(
    text.slice(0, 5000),
  );
}

function backoffMs(attempt, retryAfter) {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds, 10) * 1000;
  }
  return 1000 * 2 ** attempt;
}

const pathOf = (url) => new URL(url).pathname;

// One client per crawl: at most `concurrency` requests in flight, starts
// spaced `minIntervalMs` apart, redirects followed by hand so every hop is
// checked against private networks, and 429/5xx retried with backoff.
export function createHttpClient({
  concurrency = 3,
  timeoutMs = 10_000,
  minIntervalMs = 250,
  retries = 3,
} = {}) {
  const limit = pLimit(concurrency);
  const ua = userAgent();
  let nextStart = 0;
  let requestCount = 0;

  async function pace() {
    const now = Date.now();
    const wait = nextStart - now;
    nextStart = Math.max(now, nextStart) + minIntervalMs;
    if (wait > 0) await sleep(wait);
  }

  async function once(url, accept) {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(new URL(current).hostname);
      await pace();
      requestCount++;
      const res = await fetch(current, {
        headers: { "User-Agent": ua, Accept: accept, "Accept-Language": "en" },
        redirect: "manual",
        signal,
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        current = new URL(location, current).href;
        continue;
      }
      const text = await res.text();
      return {
        url: current,
        status: res.status,
        ok: res.ok,
        headers: res.headers,
        text,
        blocked: isChallenge(res, text),
      };
    }
    throw new Error(`Too many redirects from ${pathOf(url)}`);
  }

  function get(url, { accept = "text/html,*/*" } = {}) {
    return limit(async () => {
      for (let attempt = 0; ; attempt++) {
        let res;
        try {
          res = await once(url, accept);
        } catch (err) {
          if (err instanceof CrawlError) throw err;
          // Network errors and timeouts get one retry.
          if (attempt >= 1) {
            if (err.name === "TimeoutError") {
              throw new Error(`Timed out fetching ${pathOf(url)}`);
            }
            throw err;
          }
          await sleep(1000);
          continue;
        }
        if (res.blocked || !RETRYABLE.has(res.status) || attempt >= retries) {
          return res;
        }
        await sleep(backoffMs(attempt, res.headers.get("retry-after")));
      }
    });
  }

  async function getOk(url, options) {
    const res = await get(url, options);
    if (res.blocked) throw new BlockedError(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathOf(url)}`);
    return res;
  }

  async function getJson(url) {
    const res = await getOk(url, { accept: "application/json" });
    try {
      return JSON.parse(res.text);
    } catch {
      throw new Error(`Expected JSON from ${pathOf(url)}`);
    }
  }

  return {
    get,
    getHtml: getOk,
    getJson,
    userAgent: ua,
    get requestCount() {
      return requestCount;
    },
  };
}
