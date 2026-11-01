import { CrawlError } from "../crawl/errors.js";
import { db } from "../db.js";
import { normalizeStoreUrl } from "../url.js";
import { INTERRUPTED_MESSAGE, runnerReady, startAudit } from "./runner.js";
import {
  ACTIVE_STATUSES,
  CACHE_MS,
  domainKey,
  isStale,
  STALE_MS,
  stageById,
} from "./state.js";

const FIELDS = {
  id: true,
  domain: true,
  status: true,
  stage: true,
  progress: true,
  error: true,
  report: true,
  createdAt: true,
  updatedAt: true,
};

// Start an audit, or reuse one: a finished audit of the same store from the
// last 24 hours, or one that's still running.
export async function requestAudit(input) {
  const url = normalizeStoreUrl(input);
  if (!url) {
    throw new CrawlError(
      "invalid_url",
      "That doesn't look like a store address. Try something like yourstore.com.",
    );
  }
  const domain = domainKey(url);
  await runnerReady();
  const now = Date.now();
  const reusable = await db.audit.findFirst({
    where: {
      domain,
      OR: [
        { status: "done", createdAt: { gte: new Date(now - CACHE_MS) } },
        {
          status: { in: ACTIVE_STATUSES },
          updatedAt: { gte: new Date(now - STALE_MS) },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (reusable) return { ...reusable, reused: true };

  const audit = await db.audit.create({
    data: { domain, status: "queued", stage: "queued", progress: 0 },
    select: { id: true, status: true },
  });
  startAudit(audit.id, url);
  return { ...audit, reused: false };
}

// The audit, or null. An unfinished audit whose runner died is marked failed
// here, so the page stops waiting for it.
export async function getAudit(id) {
  await runnerReady();
  const audit = await db.audit.findUnique({ where: { id }, select: FIELDS });
  if (!audit || !isStale(audit)) return audit;
  return db.audit.update({
    where: { id },
    data: { status: "failed", error: INTERRUPTED_MESSAGE },
    select: FIELDS,
  });
}

// What the API and the progress page see. The crawl snapshot stays server-side.
export function toPublic(audit) {
  return {
    id: audit.id,
    domain: audit.domain,
    status: audit.status,
    stage: audit.stage,
    progress: audit.progress,
    message:
      audit.status === "failed"
        ? audit.error
        : (stageById[audit.stage] ?? stageById.queued).label,
    report: audit.status === "done" ? audit.report : null,
    createdAt: audit.createdAt.toISOString(),
  };
}
