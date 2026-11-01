import { z } from "zod";
import { AREAS } from "../checks/areas.js";
import { CheckResult } from "../checks/schema.js";
import { PageSpeedSection } from "../crawl/schema.js";

const str = z.string();
const nstr = z.string().nullable();
const int = z.number().int().nonnegative();
const score = int.max(100).nullable();
const scale = z.number().int().min(1).max(5);
const phase = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const grade = z.enum(["good", "needs_work", "big_opportunity"]).nullable();
const area = z.enum(AREAS);
// "ai" when the LLM wrote it, "template" when built from the checks instead.
const source = z.enum(["ai", "template"]);

const LlmCall = z.object({
  status: z.enum(["ok", "failed", "skipped"]),
  attempts: int,
  // Why the first answer was rejected, when it was retried.
  rejected: z.array(str),
  inputTokens: int,
  outputTokens: int,
  model: nstr,
  error: nstr,
});

export const AuditReport = z.object({
  version: z.literal(1),
  generatedAt: z.iso.datetime(),
  store: z.object({
    name: nstr,
    domain: str,
    url: str,
    storefront: z.enum(["theme", "headless"]),
    currency: nstr,
    theme: nstr,
  }),
  scores: z.object({
    overall: z.object({ score, grade, areasScored: int }),
    areas: z.array(
      z.object({
        area,
        label: str,
        weight: int,
        score,
        grade,
        coverage: z.number().min(0).max(1),
        passed: int,
        failed: int,
        unknown: int,
        deductions: z.array(z.object({ checkId: str, weight: int })),
      }),
    ),
  }),
  summary: z.object({ text: str, source }),
  opportunities: z.array(
    z.object({
      id: str,
      area,
      title: str,
      finding: str,
      recommendation: str,
      estLift: nstr,
      impact: scale,
      effort: scale,
      phase,
      evidenceRefs: z.array(str).min(1),
      source,
    }),
  ),
  roadmap: z.array(
    z.object({ phase, label: str, rule: str, opportunityIds: z.array(str) }),
  ),
  copyExamples: z.object({
    status: z.enum(["ok", "none", "unavailable"]),
    note: nstr,
    items: z.array(
      z.object({
        handle: str,
        title: str,
        url: str,
        before: str,
        beforeWordCount: int,
        after: str,
        afterWordCount: int,
        whyBetter: str,
      }),
    ),
  }),
  checks: z.array(CheckResult),
  performance: PageSpeedSection,
  limitations: z.array(str),
  meta: z.object({
    crawl: z.object({
      startedAt: z.iso.datetime(),
      durationMs: int,
      requestCount: int,
    }),
    llm: z.object({
      model: str,
      calls: z.object({
        opportunities: LlmCall,
        copyExamples: LlmCall,
        summary: LlmCall,
      }),
    }),
  }),
});
