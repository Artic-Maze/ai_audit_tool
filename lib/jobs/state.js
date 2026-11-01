// Audit job state, shared by the server (which writes it) and the progress
// page (which shows it), so keep this file browser-safe.

// In pipeline order. Crawl stages come from crawlStore's onProgress, and
// "writing" from auditSnapshot.
export const STAGES = [
  { id: "queued", status: "queued", progress: 0, label: "Waiting to start" },
  {
    id: "detecting",
    status: "crawling",
    progress: 5,
    label: "Checking the store",
  },
  {
    id: "products",
    status: "crawling",
    progress: 20,
    label: "Crawling products",
  },
  {
    id: "product_pages",
    status: "crawling",
    progress: 40,
    label: "Reading product pages",
  },
  { id: "search", status: "crawling", progress: 55, label: "Checking search" },
  {
    id: "pagespeed",
    status: "crawling",
    progress: 65,
    label: "Measuring page speed",
  },
  {
    id: "writing",
    status: "analyzing",
    progress: 85,
    label: "Writing the report",
  },
  { id: "done", status: "done", progress: 100, label: "Report ready" },
];

export const stageById = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export const ACTIVE_STATUSES = ["queued", "crawling", "analyzing"];

export const isFinished = (status) => status === "done" || status === "failed";

// A finished audit is reused for a day, per domain.
export const CACHE_MS = 24 * 60 * 60 * 1000;

// An unfinished audit with no progress for this long has lost its runner
// (a restart or crash). No stage legitimately takes this long.
export const STALE_MS = 15 * 60 * 1000;

export const isStale = (audit, now = Date.now()) =>
  ACTIVE_STATUSES.includes(audit.status) &&
  now - new Date(audit.updatedAt).getTime() > STALE_MS;

// Cache key for a normalized store URL: the host without "www.", so both
// spellings share one audit.
export const domainKey = (url) => new URL(url).hostname.replace(/^www\./, "");
