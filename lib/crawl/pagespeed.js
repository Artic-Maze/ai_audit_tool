import { createHttpClient } from "./http.js";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const STRATEGIES = ["mobile", "desktop"];

const round = (n, digits = 0) =>
  Number.isFinite(n) ? Number(n.toFixed(digits)) : null;

function extract(data) {
  const lighthouse = data.lighthouseResult;
  const audits = lighthouse?.audits ?? {};
  const numeric = (id) => audits[id]?.numericValue;
  const score = lighthouse?.categories?.performance?.score;

  // Field data (real Chrome users) only exists for sites with enough traffic.
  const experience = data.loadingExperience;
  const metrics = experience?.metrics;
  const field = metrics
    ? {
        scope: experience.origin_fallback ? "origin" : "url",
        overall: experience.overall_category ?? null,
        lcpMs: metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
        cls: Number.isFinite(metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile)
          ? metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : null,
        inpMs: metrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      }
    : null;

  return {
    lab: {
      performanceScore: Number.isFinite(score) ? Math.round(score * 100) : null,
      lcpMs: round(numeric("largest-contentful-paint")),
      cls: round(numeric("cumulative-layout-shift"), 3),
      tbtMs: round(numeric("total-blocking-time")),
      fcpMs: round(numeric("first-contentful-paint")),
    },
    field,
  };
}

async function run(client, page, url, strategy) {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  if (process.env.PAGESPEED_API_KEY) {
    params.set("key", process.env.PAGESPEED_API_KEY);
  }
  try {
    const res = await client.get(`${ENDPOINT}?${params}`, {
      accept: "application/json",
    });
    let data = null;
    try {
      data = JSON.parse(res.text);
    } catch {
      // Handled below.
    }
    if (!res.ok || !data) {
      throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
    }
    return { page, url, strategy, status: "ok", ...extract(data) };
  } catch (err) {
    return { page, url, strategy, status: "unavailable", error: err.message };
  }
}

// targets: { homepage: url, product: url | null }
export async function collectPageSpeed(targets) {
  // Lighthouse runs take 10–40 s each, so this client gets a long timeout.
  const client = createHttpClient({
    concurrency: 4,
    timeoutMs: 90_000,
    minIntervalMs: 0,
    retries: 1,
  });
  const runs = Object.entries(targets)
    .filter(([, url]) => url)
    .flatMap(([page, url]) =>
      STRATEGIES.map((strategy) => run(client, page, url, strategy)),
    );
  const results = await Promise.all(runs);
  if (results.every((r) => r.status !== "ok")) {
    throw new Error(results[0]?.error ?? "No pages to measure");
  }
  return { runs: results, keyed: Boolean(process.env.PAGESPEED_API_KEY) };
}
