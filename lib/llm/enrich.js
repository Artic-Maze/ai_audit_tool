import { THIN_WORDS } from "../checks/copy.js";
import { sectionData } from "../checks/helpers.js";
import { wordCount } from "../crawl/html.js";
import { FIXES, gradeLabel, phaseFor } from "../scoring/index.js";
import { generate as defaultGenerate, MODEL } from "./client.js";
import {
  copyFacts,
  opportunitiesFacts,
  summaryFacts,
  weakestProducts,
} from "./facts.js";
import { ungroundedNumbers } from "./grounding.js";
import {
  copyPrompt,
  opportunitiesPrompt,
  summaryPrompt,
  SYSTEM,
} from "./prompts.js";
import { CopyOutput, OpportunitiesOutput, SummaryOutput } from "./schemas.js";

const RANGE = /\d+(?:\.\d+)?\s*%?\s*(?:–|-|to)\s*\d/;
const MIN_COPY_WORDS = 50;
const MAX_COPY_WORDS = 220;

function sameKeys(expected, got, noun) {
  const problems = [];
  const missing = expected.filter((key) => !got.includes(key));
  const unknown = got.filter((key) => !expected.includes(key));
  const repeated = got.filter((key, i) => got.indexOf(key) !== i);
  if (missing.length) problems.push(`Missing ${noun}s: ${missing.join(", ")}.`);
  if (unknown.length) problems.push(`Unknown ${noun}s: ${unknown.join(", ")}.`);
  if (repeated.length)
    problems.push(`Repeated ${noun}s: ${repeated.join(", ")}.`);
  return problems;
}

function inventedNumbers(label, text, facts, hint = "") {
  const invented = ungroundedNumbers(text, facts);
  return invented.length
    ? [
        `${label} uses numbers that aren't in the facts: ${invented.join(", ")}.${hint}`,
      ]
    : [];
}

// Call A: the finding, recommendation and lift range for each opportunity.
async function writeOpportunities({
  generate,
  snapshot,
  checks,
  scores,
  opportunities,
}) {
  if (opportunities.length === 0) return { skipped: true };
  const facts = opportunitiesFacts({ snapshot, checks, scores, opportunities });
  const factsText = JSON.stringify(facts);
  const { data, ...meta } = await generate({
    name: "opportunities",
    system: SYSTEM,
    prompt: opportunitiesPrompt(facts),
    schema: OpportunitiesOutput,
    check: ({ opportunities: written }) => [
      ...sameKeys(
        opportunities.map((o) => o.id),
        written.map((o) => o.id),
        "opportunity id",
      ),
      ...written.flatMap((o) => [
        ...inventedNumbers(`The finding for "${o.id}"`, o.finding, factsText),
        ...(RANGE.test(o.estLift)
          ? []
          : [`The estLift for "${o.id}" must be a range, such as "5–15%".`]),
      ]),
    ],
  });
  return { value: data.opportunities, meta };
}

// Call B: before/after rewrites of the thinnest product descriptions.
async function writeCopy({ generate, snapshot }) {
  const products = weakestProducts(snapshot);
  if (products.length === 0) return { skipped: true };
  const facts = copyFacts({ snapshot, products });
  // A rewrite may only use figures from its own product, not other products.
  const factsByHandle = new Map(
    facts.products.map((p) => [p.handle, JSON.stringify(p)]),
  );
  const { data, ...meta } = await generate({
    name: "copy examples",
    system: SYSTEM,
    prompt: copyPrompt(facts),
    schema: CopyOutput,
    check: ({ rewrites }) => [
      ...sameKeys(
        products.map((p) => p.handle),
        rewrites.map((r) => r.handle),
        "product handle",
      ),
      ...rewrites.flatMap((r) => {
        const words = wordCount(r.after);
        return [
          ...(words < MIN_COPY_WORDS || words > MAX_COPY_WORDS
            ? [
                `The rewrite for "${r.handle}" is ${words} words; aim for 80 to 150.`,
              ]
            : []),
          ...inventedNumbers(
            `The rewrite for "${r.handle}"`,
            r.after,
            factsByHandle.get(r.handle) ?? "",
            " Use a [placeholder] instead.",
          ),
        ];
      }),
    ],
  });
  const byHandle = new Map(data.rewrites.map((r) => [r.handle, r]));
  return {
    value: products.map((p) => {
      const { after, whyBetter } = byHandle.get(p.handle);
      return {
        handle: p.handle,
        title: p.title,
        url: `${snapshot.store.origin}/products/${p.handle}`,
        before: p.descriptionText,
        beforeWordCount: p.descriptionWordCount,
        after,
        afterWordCount: wordCount(after),
        whyBetter,
      };
    }),
    meta,
  };
}

// Call C: a 3–4 sentence executive summary.
async function writeSummary({
  generate,
  snapshot,
  checks,
  scores,
  opportunities,
}) {
  const facts = summaryFacts({ snapshot, checks, scores, opportunities });
  const factsText = JSON.stringify(facts);
  const { data, ...meta } = await generate({
    name: "summary",
    system: SYSTEM,
    prompt: summaryPrompt(facts),
    schema: SummaryOutput,
    maxTokens: 8_000,
    check: ({ summary }) => {
      const sentences = summary.split(/(?<=[.!?])\s+/).filter(Boolean).length;
      return [
        ...(sentences < 3 || sentences > 4
          ? [`The summary has ${sentences} sentences; write 3 or 4.`]
          : []),
        ...inventedNumbers("The summary", summary, factsText),
      ];
    },
  });
  return { value: data.summary, meta };
}

// Runs a call, turning a failure into a status the report can record.
async function settle(call) {
  try {
    const result = await call();
    if (result.skipped) return { status: "skipped" };
    return { status: "ok", value: result.value, ...result.meta };
  } catch (err) {
    return {
      status: "failed",
      error: err.message,
      usage: err.usage,
      attempts: err.attempts,
      rejected: err.rejected,
    };
  }
}

function callMeta({ status, attempts, usage, model, error, rejected }) {
  return {
    status,
    attempts: attempts ?? 0,
    rejected: rejected ?? [],
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    model: model ?? null,
    error: error ?? null,
  };
}

// Fallbacks built from the checks alone, so a failed call degrades the report
// instead of breaking it.
function templateProse(seed, checks) {
  const evidence = seed.evidenceRefs.map(
    (id) => checks.find((c) => c.id === id).evidence[0],
  );
  return {
    finding: evidence.join(" "),
    recommendation: FIXES[seed.id].pitch,
    estLift: null,
  };
}

function templateSummary({ snapshot, scores, opportunities }) {
  const name = snapshot.store.name ?? snapshot.store.domain;
  const { score, grade } = scores.overall;
  const sentences = [
    score === null
      ? `There wasn't enough public data to give ${name} an overall score.`
      : `${name} scores ${score}/100 overall (${gradeLabel(grade)}).`,
  ];
  const [strongest] = scores.areas
    .filter((a) => a.score !== null)
    .sort((a, b) => b.score - a.score);
  if (strongest) {
    sentences.push(
      `Its strongest area is ${strongest.label.toLowerCase()} at ${strongest.score}/100.`,
    );
  }
  sentences.push(
    opportunities.length
      ? `The biggest opportunities: ${opportunities
          .slice(0, 3)
          .map((o) => o.title.charAt(0).toLowerCase() + o.title.slice(1))
          .join("; ")}.`
      : "The checks we could run found no major gaps.",
  );
  return sentences.join(" ");
}

function copyExamples(copy, snapshot) {
  if (!sectionData(snapshot.products)) {
    return {
      status: "unavailable",
      note: "Product data couldn't be collected, so there were no descriptions to rewrite.",
      items: [],
    };
  }
  if (copy.status === "skipped") {
    return {
      status: "none",
      note: `No product descriptions under ${THIN_WORDS} words were found.`,
      items: [],
    };
  }
  if (copy.status === "failed") {
    return {
      status: "unavailable",
      note: "Copy examples couldn't be written for this audit.",
      items: [],
    };
  }
  return { status: "ok", note: null, items: copy.value };
}

// The LLM's part of the audit: three independent calls, run in parallel.
// Opportunities, their impact and effort, and the roadmap phases are fixed by
// code before this runs; the calls only write prose around them.
export async function enrich({
  snapshot,
  checks,
  scores,
  opportunities,
  generate = defaultGenerate,
}) {
  const context = { generate, snapshot, checks, scores, opportunities };
  const [prose, copy, summary] = await Promise.all([
    settle(() => writeOpportunities(context)),
    settle(() => writeCopy(context)),
    settle(() => writeSummary(context)),
  ]);

  const written = new Map(
    prose.status === "ok" ? prose.value.map((o) => [o.id, o]) : [],
  );
  return {
    opportunities: opportunities.map((seed) => {
      const ai = written.get(seed.id);
      return {
        ...seed,
        ...(ai
          ? {
              title: ai.title,
              finding: ai.finding,
              recommendation: ai.recommendation,
              estLift: ai.estLift,
              source: "ai",
            }
          : { ...templateProse(seed, checks), source: "template" }),
        phase: phaseFor(seed),
      };
    }),
    copyExamples: copyExamples(copy, snapshot),
    summary:
      summary.status === "ok"
        ? { text: summary.value, source: "ai" }
        : { text: templateSummary(context), source: "template" },
    llm: {
      model: MODEL,
      calls: {
        opportunities: callMeta(prose),
        copyExamples: callMeta(copy),
        summary: callMeta(summary),
      },
    },
  };
}
