import { z } from "zod";

// What each call returns. Length limits aren't expressible in the API's JSON
// schema subset; the SDK drops them there and zod enforces them here.
const text = (max) => z.string().min(1).max(max);

export const OpportunitiesOutput = z.object({
  opportunities: z.array(
    z.object({
      id: z.string(),
      title: text(80),
      finding: text(600),
      recommendation: text(600),
      estLift: text(160),
    }),
  ),
});

export const CopyOutput = z.object({
  rewrites: z.array(
    z.object({
      handle: z.string(),
      after: text(2000),
      whyBetter: text(400),
    }),
  ),
});

export const SummaryOutput = z.object({
  summary: text(1200),
});
