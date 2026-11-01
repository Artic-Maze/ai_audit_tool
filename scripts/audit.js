import "dotenv/config";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { auditSnapshot, auditStore } from "../lib/audit.js";
import { fmtInt } from "../lib/checks/format.js";
import { CrawlError } from "../lib/crawl/index.js";
import { StoreSnapshot } from "../lib/crawl/schema.js";
import { gradeLabel } from "../lib/scoring/index.js";

const USAGE =
  "Usage: npm run audit -- <store-url | snapshot.json> [--out report.json] [--no-pagespeed] [--no-products-json]";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", default: "report.json" },
    "no-pagespeed": { type: "boolean", default: false },
    "no-products-json": { type: "boolean", default: false },
  },
});

if (positionals.length !== 1) {
  console.error(USAGE);
  process.exit(1);
}
const [input] = positionals;

async function loadSnapshot(file) {
  const parsed = StoreSnapshot.safeParse(
    JSON.parse(await readFile(file, "utf8")),
  );
  if (!parsed.success) {
    console.error(
      `✗ ${file} isn't a valid snapshot. Re-crawl it with npm run crawl.\n${z.prettifyError(parsed.error)}`,
    );
    process.exit(1);
  }
  return parsed.data;
}

function printReport(report, out) {
  const { store, scores, summary, opportunities, copyExamples, meta } = report;
  const overall = scores.overall.score === null ? "–" : scores.overall.score;
  console.log(
    `\n${store.domain} · ${overall}/100 ${gradeLabel(scores.overall.grade)}`,
  );
  console.log(`\nSummary (${summary.source}): ${summary.text}`);

  console.log(`\nOpportunities (${opportunities.length})`);
  opportunities.forEach((o, i) => {
    console.log(
      `  ${i + 1}. ${o.title} · impact ${o.impact}, effort ${o.effort} · phase ${o.phase} (${o.source})`,
    );
    console.log(`     Finding: ${o.finding}`);
    console.log(`     Recommendation: ${o.recommendation}`);
    console.log(`     Estimated lift: ${o.estLift ?? "not estimated"}`);
  });

  console.log(
    `\nCopy examples: ${copyExamples.status}${copyExamples.note ? ` (${copyExamples.note})` : ""}`,
  );
  for (const item of copyExamples.items) {
    console.log(
      `  ${item.title}: ${item.beforeWordCount} → ${item.afterWordCount} words`,
    );
  }

  const calls = Object.entries(meta.llm.calls).map(([name, call]) => {
    const tokens = `${fmtInt(call.inputTokens)} in / ${fmtInt(call.outputTokens)} out`;
    return call.status === "failed"
      ? `${name} failed (${call.error})`
      : `${name} ${call.status}${call.attempts ? `, ${call.attempts} attempt${call.attempts === 1 ? "" : "s"}, ${tokens}` : ""}${call.rejected.length ? ` (retried: ${call.rejected.join(" ")})` : ""}`;
  });
  console.log(`\nLLM (${meta.llm.model}): ${calls.join(" · ")}`);
  console.log(`→ ${out}`);
}

try {
  const onProgress = (stage) => console.error(`→ ${stage}`);
  const report =
    input.endsWith(".json") && existsSync(input)
      ? await auditSnapshot(await loadSnapshot(input), { onProgress })
      : (
          await auditStore(input, {
            onProgress,
            crawlOptions: {
              skipPageSpeed: values["no-pagespeed"],
              skipProductsJson: values["no-products-json"],
            },
          })
        ).report;
  await writeFile(values.out, `${JSON.stringify(report, null, 2)}\n`);
  printReport(report, values.out);
} catch (err) {
  if (err instanceof CrawlError) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  throw err;
}
