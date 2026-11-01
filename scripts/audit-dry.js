import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { AREA_LABELS, runChecks } from "../lib/checks/index.js";
import { StoreSnapshot } from "../lib/crawl/schema.js";
import {
  buildRoadmap,
  CHECK_WEIGHTS,
  gradeLabel,
  scoreAudit,
  seedOpportunities,
} from "../lib/scoring/index.js";

const USAGE = "Usage: npm run audit:dry -- <snapshot.json> [--json]";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: "boolean", default: false } },
});

if (positionals.length !== 1) {
  console.error(USAGE);
  process.exit(1);
}
const [file] = positionals;

let raw;
try {
  raw = JSON.parse(await readFile(file, "utf8"));
} catch (err) {
  console.error(`✗ Couldn't read ${file}: ${err.message}`);
  process.exit(1);
}

const parsed = StoreSnapshot.safeParse(raw);
if (!parsed.success) {
  console.error(
    `✗ ${file} isn't a valid snapshot. Re-crawl it with npm run crawl.\n${z.prettifyError(parsed.error)}`,
  );
  process.exit(1);
}

const snapshot = parsed.data;
const checks = runChecks(snapshot);
const scores = scoreAudit(checks);
const roadmap = buildRoadmap(seedOpportunities(checks));

if (values.json) {
  console.log(JSON.stringify({ checks, scores, roadmap }, null, 2));
  process.exit(0);
}

const scored = checks.filter((c) => c.area !== "performance");
const byStatus = (passed) => scored.filter((c) => c.passed === passed);
const fmtScore = (score) => (score === null ? "–" : String(score));
const { store, crawl } = snapshot;

console.log(
  `\n${store.domain}${store.storefront === "headless" ? " (headless storefront)" : ""} · crawled ${crawl.startedAt.slice(0, 16).replace("T", " ")} UTC`,
);
console.log(
  `\nOverall  ${fmtScore(scores.overall.score)}/100  ${gradeLabel(scores.overall.grade)}\n`,
);
for (const area of scores.areas) {
  const counts = [`${area.passed} passed`];
  if (area.failed) counts.push(`${area.failed} failed`);
  if (area.unknown) counts.push(`${area.unknown} unknown`);
  console.log(
    `  ${area.label.padEnd(18)} ${fmtScore(area.score).padStart(3)}  ${gradeLabel(area.grade).padEnd(16)} ${counts.join(" · ")}`,
  );
}

const failed = byStatus(false);
console.log(`\nFailed checks (${failed.length})`);
for (const c of failed) {
  console.log(
    `  ✗ ${c.title}: ${c.display} (target ${c.threshold}) · weight ${CHECK_WEIGHTS[c.id]} in ${AREA_LABELS[c.area]}`,
  );
  for (const line of c.evidence) console.log(`      ${line}`);
}

const unknown = byStatus(null);
if (unknown.length) {
  console.log(`\nCouldn't measure (${unknown.length})`);
  for (const c of unknown) console.log(`  ? ${c.title}: ${c.evidence[0]}`);
}

console.log(
  `\nPassed: ${
    byStatus(true)
      .map((c) => c.title)
      .join(", ") || "none"
  }`,
);

console.log("\nPerformance (context, not scored)");
for (const c of checks.filter((check) => check.area === "performance")) {
  const mark = c.passed === null ? "?" : c.passed ? "✓" : "✗";
  const detail =
    c.passed === null ? c.evidence[0] : `${c.display} (target ${c.threshold})`;
  console.log(`  ${mark} ${c.title.padEnd(26)} ${detail}`);
}

console.log("\nRoadmap preview (default impact/effort for each failed check)");
for (const phase of roadmap) {
  console.log(`  ${phase.label}`);
  if (phase.items.length === 0) console.log("    –");
  for (const item of phase.items) {
    console.log(
      `    • ${item.title} (impact ${item.impact}, effort ${item.effort})`,
    );
  }
}
console.log("");
