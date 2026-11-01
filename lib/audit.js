import { runChecks } from "./checks/index.js";
import { crawlStore } from "./crawl/index.js";
import { enrich } from "./llm/enrich.js";
import { buildReport } from "./report/build.js";
import { scoreAudit, seedOpportunities } from "./scoring/index.js";

// A crawled snapshot to a validated AuditReport. Checks, scores, the choice of
// opportunities, their impact and effort, and the roadmap are all code; the
// LLM only writes the prose around them.
export async function auditSnapshot(
  snapshot,
  { onProgress = () => {}, generate } = {},
) {
  const checks = runChecks(snapshot);
  const scores = scoreAudit(checks);
  const opportunities = seedOpportunities(checks);
  onProgress("writing");
  const written = await enrich({
    snapshot,
    checks,
    scores,
    opportunities,
    generate,
  });
  return buildReport({ snapshot, checks, scores, ...written });
}

// The whole pipeline from a store URL. Throws CrawlError when the store can't
// be audited at all.
export async function auditStore(
  url,
  { onProgress = () => {}, crawlOptions = {}, generate } = {},
) {
  const snapshot = await crawlStore(url, { ...crawlOptions, onProgress });
  const report = await auditSnapshot(snapshot, { onProgress, generate });
  return { snapshot, report };
}
