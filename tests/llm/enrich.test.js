import { describe, expect, it } from "vitest";
import { runChecks } from "../../lib/checks/index.js";
import { LlmError } from "../../lib/llm/client.js";
import { enrich } from "../../lib/llm/enrich.js";
import {
  FIXES,
  phaseFor,
  scoreAudit,
  seedOpportunities,
} from "../../lib/scoring/index.js";
import { headlessStore, strongStore, weakStore } from "../fixtures/stores.js";

function contextFor(snapshot) {
  const checks = runChecks(snapshot);
  return {
    snapshot,
    checks,
    scores: scoreAudit(checks),
    opportunities: seedOpportunities(checks),
  };
}

// Stands in for generate(): answers each call with answers[name](request),
// and fails calls that have no answer. Records every request.
function fakeGenerate(answers = {}) {
  const requests = [];
  async function generate(request) {
    requests.push(request);
    const answer = answers[request.name];
    if (!answer) {
      throw new LlmError(`${request.name}: offline`, {
        usage: { inputTokens: 0, outputTokens: 0 },
        attempts: 1,
        rejected: [],
      });
    }
    return {
      data: answer(request),
      usage: { inputTokens: 10, outputTokens: 5 },
      attempts: 1,
      rejected: [],
      model: "claude-sonnet-5-5",
    };
  }
  return { generate, requests };
}

const proseFor = (opportunities) => () => ({
  opportunities: opportunities.map((o) => ({
    id: o.id,
    title: `Fix ${o.id}`,
    finding: `Finding for ${o.id}.`,
    recommendation: `Do ${o.id}.`,
    estLift: "5–10% more conversions",
  })),
});

const checkOf = (requests, name) => requests.find((r) => r.name === name).check;

describe("enrich", () => {
  it("writes AI prose onto the opportunities code chose, without changing them", async () => {
    const context = contextFor(weakStore);
    const { generate } = fakeGenerate({
      opportunities: proseFor(context.opportunities),
    });
    const { opportunities } = await enrich({ ...context, generate });
    expect(
      opportunities.map((o) => [o.id, o.impact, o.effort, o.phase]),
    ).toEqual(
      context.opportunities.map((o) => [o.id, o.impact, o.effort, phaseFor(o)]),
    );
    expect(opportunities[0]).toMatchObject({
      title: "Fix email-flows",
      finding: "Finding for email-flows.",
      estLift: "5–10% more conversions",
      source: "ai",
    });
  });

  it("falls back to text built from the checks when calls fail", async () => {
    const context = contextFor(weakStore);
    const result = await enrich({
      ...context,
      generate: fakeGenerate().generate,
    });
    const [first] = result.opportunities;
    expect(first).toMatchObject({
      id: "email-flows",
      title: FIXES["email-flows"].title,
      finding: context.checks.find((c) => c.id === "email.app").evidence[0],
      recommendation: FIXES["email-flows"].pitch,
      estLift: null,
      source: "template",
    });
    expect(result.summary).toEqual({
      text: "Example Store scores 3/100 overall (Big opportunity). Its strongest area is support at 20/100. The biggest opportunities: set up AI-personalized email and SMS flows; improve product descriptions with AI; add AI product recommendations.",
      source: "template",
    });
    expect(result.copyExamples).toMatchObject({
      status: "unavailable",
      items: [],
    });
    expect(result.llm.calls.summary).toMatchObject({
      status: "failed",
      error: "summary: offline",
    });
  });

  it("rejects write-ups that drop ids, invent numbers or skip the lift range", async () => {
    const context = contextFor(weakStore);
    const { generate, requests } = fakeGenerate();
    await enrich({ ...context, generate });
    const [first, ...rest] = context.opportunities;
    const problems = checkOf(
      requests,
      "opportunities",
    )({
      opportunities: rest.map((o) => ({
        id: o.id,
        title: "t",
        finding:
          o.id === "product-copy" ? "73% of products are thin." : "Fine.",
        recommendation: "r",
        estLift: o.id === "seo-meta" ? "a lot" : "5–10%",
      })),
    });
    expect(problems).toEqual([
      `Missing opportunity ids: ${first.id}.`,
      'The finding for "product-copy" uses numbers that aren\'t in the facts: 73.',
      'The estLift for "seo-meta" must be a range, such as "5–15%".',
    ]);
  });

  it("rewrites the thinnest descriptions, keeping the original as the before", async () => {
    const context = contextFor(weakStore);
    const after = "A soft, warm hoodie. ".repeat(20).trim();
    const { generate } = fakeGenerate({
      "copy examples": () => ({
        rewrites: ["product-1", "product-10"].map((handle) => ({
          handle,
          after,
          whyBetter: "Fuller.",
        })),
      }),
    });
    const { copyExamples } = await enrich({ ...context, generate });
    expect(copyExamples.status).toBe("ok");
    expect(copyExamples.items.map((i) => i.handle)).toEqual([
      "product-1",
      "product-10",
    ]);
    expect(copyExamples.items[0]).toMatchObject({
      url: "https://example-store.com/products/product-1",
      before: weakStore.products.data.products[0].descriptionText,
      beforeWordCount: 12,
      afterWordCount: 80,
    });
  });

  it("only lets a rewrite use figures from its own product", async () => {
    const context = contextFor(weakStore);
    const { generate, requests } = fakeGenerate();
    await enrich({ ...context, generate });
    const longEnough = "Soft hoodie. ".repeat(30);
    const problems = checkOf(
      requests,
      "copy examples",
    )({
      rewrites: [
        {
          handle: "product-1",
          after: `${longEnough} Made from 100% cotton.`,
          whyBetter: "w",
        },
        { handle: "product-10", after: "Too short.", whyBetter: "w" },
      ],
    });
    expect(problems).toEqual([
      'The rewrite for "product-1" uses numbers that aren\'t in the facts: 100. Use a [placeholder] instead.',
      'The rewrite for "product-10" is 2 words; aim for 80 to 150.',
    ]);
  });

  it("skips copy examples when no description is thin", async () => {
    const { generate, requests } = fakeGenerate();
    const { copyExamples } = await enrich({
      ...contextFor(strongStore),
      generate,
    });
    expect(copyExamples).toEqual({
      status: "none",
      note: "No product descriptions under 50 words were found.",
      items: [],
    });
    expect(requests.map((r) => r.name)).not.toContain("copy examples");
  });

  it("explains missing copy examples for a store without product data", async () => {
    const { copyExamples } = await enrich({
      ...contextFor(headlessStore),
      generate: fakeGenerate().generate,
    });
    expect(copyExamples).toMatchObject({ status: "unavailable", items: [] });
    expect(copyExamples.note).toContain("Product data couldn't be collected");
  });

  it("wants a 3–4 sentence summary that only cites given numbers", async () => {
    const { generate, requests } = fakeGenerate();
    await enrich({ ...contextFor(weakStore), generate });
    const check = checkOf(requests, "summary");
    expect(check({ summary: "Short. Too short." })).toEqual([
      "The summary has 2 sentences; write 3 or 4.",
    ]);
    expect(
      check({ summary: "It scores 3/100. One. Two. It could gain 40%." }),
    ).toEqual(["The summary uses numbers that aren't in the facts: 40."]);
  });

  it("sends the same prompts for the same snapshot", async () => {
    const first = fakeGenerate();
    const second = fakeGenerate();
    await enrich({ ...contextFor(weakStore), generate: first.generate });
    await enrich({
      ...contextFor(structuredClone(weakStore)),
      generate: second.generate,
    });
    expect(second.requests.map((r) => r.prompt)).toEqual(
      first.requests.map((r) => r.prompt),
    );
  });
});
