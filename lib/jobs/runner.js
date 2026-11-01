import pLimit from "p-limit";
import { auditStore } from "../audit.js";
import { CrawlError } from "../crawl/errors.js";
import { db } from "../db.js";
import { ACTIVE_STATUSES, stageById } from "./state.js";

// Audits running at once in this process; the rest wait as "queued".
const MAX_CONCURRENT = 3;

const FAILED_MESSAGE =
  "Something went wrong while auditing this store. Please try again.";

export const INTERRUPTED_MESSAGE =
  "This audit was interrupted. Please run it again.";

// Audits run in-process, so any still marked as running when a process
// starts belonged to an earlier one (a restart or deploy) and can't finish.
// This assumes a single app instance, as the planned deployment has.
async function failInterrupted() {
  try {
    const { count } = await db.audit.updateMany({
      where: { status: { in: ACTIVE_STATUSES } },
      data: { status: "failed", error: INTERRUPTED_MESSAGE },
    });
    if (count) console.warn(`Marked ${count} interrupted audit(s) as failed`);
  } catch (err) {
    console.error("Couldn't clean up interrupted audits", err);
  }
}

// On globalThis so hot reloads and separate route bundles share one queue,
// and the cleanup runs once per process.
const jobs = (globalThis.auditJobs ??= {
  limit: pLimit(MAX_CONCURRENT),
  cleanup: failInterrupted(),
});

// Resolves once leftover audits from an earlier process are marked failed.
export const runnerReady = () => jobs.cleanup;

async function runAudit(id, url) {
  // Skip audits that were marked failed (stale) while waiting in the queue.
  const current = await db.audit.findUnique({
    where: { id },
    select: { status: true },
  });
  if (current?.status !== "queued") return;

  // Stage updates are written one at a time, in order. They're progress
  // only, so a failed write is logged rather than failing the audit.
  let writes = Promise.resolve();
  const setStage = (stage) => {
    const { status, progress } = stageById[stage];
    writes = writes
      .then(() =>
        db.audit.update({ where: { id }, data: { status, progress, stage } }),
      )
      .catch((err) =>
        console.error(`Audit ${id}: progress update failed`, err),
      );
  };

  try {
    const { snapshot, report } = await auditStore(url, {
      onProgress: setStage,
    });
    await writes;
    await db.audit.update({
      where: { id },
      data: { status: "done", stage: "done", progress: 100, snapshot, report },
    });
  } catch (err) {
    await writes;
    if (!(err instanceof CrawlError)) console.error(`Audit ${id} failed`, err);
    await db.audit.update({
      where: { id },
      data: {
        status: "failed",
        error: err instanceof CrawlError ? err.message : FAILED_MESSAGE,
      },
    });
  }
}

// Run an audit in the background. Never throws: every outcome ends up on the
// Audit row, which the API polls.
export function startAudit(id, url) {
  jobs
    .limit(() => runAudit(id, url))
    .catch((err) =>
      console.error(`Audit ${id}: couldn't record the result`, err),
    );
}
