import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generate, LlmError } from "../../lib/llm/client.js";

const Schema = z.object({ answer: z.string().max(10) });

function reply(body, overrides = {}) {
  return {
    model: "claude-sonnet-5-5",
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 20 },
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      {
        type: "text",
        text: typeof body === "string" ? body : JSON.stringify(body),
      },
    ],
    ...overrides,
  };
}

// Stands in for the Anthropic client: returns canned responses in order.
function fakeClient(...responses) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        create: async (params) => {
          requests.push(params);
          const next = responses.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      },
    },
  };
}

const call = (client, extra = {}) =>
  generate({
    name: "test",
    system: "sys",
    prompt: "Say hi.",
    schema: Schema,
    client,
    ...extra,
  });

describe("generate", () => {
  it("returns the parsed answer, asking for structured output with fallbacks", async () => {
    const client = fakeClient(reply({ answer: "hi" }));
    expect(await call(client)).toEqual({
      data: { answer: "hi" },
      usage: { inputTokens: 100, outputTokens: 20 },
      attempts: 1,
      rejected: [],
      model: "claude-sonnet-5-5",
    });
    const [request] = client.requests;
    expect(request).toMatchObject({
      model: "claude-sonnet-5-5",
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: "sys",
      output_config: { effort: "medium", format: { type: "json_schema" } },
      messages: [{ role: "user", content: "Say hi." }],
    });
    expect(request).not.toHaveProperty("temperature");
  });

  it("retries once with the validation errors added to the prompt", async () => {
    const client = fakeClient(
      reply({ answer: "far too long an answer" }),
      reply({ answer: "hi" }),
    );
    const result = await call(client);
    expect(result).toMatchObject({
      attempts: 2,
      usage: { inputTokens: 200, outputTokens: 40 },
    });
    expect(result.rejected[0]).toContain("answer");
    expect(client.requests[1].messages[0].content).toMatch(
      /^Say hi\.\n\nYour previous answer was rejected:\n- [\s\S]+\nAnswer again with these fixed\.$/,
    );
  });

  it("retries when the extra check finds problems", async () => {
    const client = fakeClient(
      reply({ answer: "bad" }),
      reply({ answer: "good" }),
    );
    const result = await call(client, {
      check: ({ answer }) => (answer === "bad" ? ["Answer must be good."] : []),
    });
    expect(result.data.answer).toBe("good");
    expect(client.requests[1].messages[0].content).toContain(
      "- Answer must be good.",
    );
  });

  it("asks for a shorter answer after hitting the token limit", async () => {
    const client = fakeClient(
      reply("{", { stop_reason: "max_tokens" }),
      reply({ answer: "hi" }),
    );
    expect((await call(client)).rejected).toEqual([
      "The answer was cut off at the length limit. Keep it shorter.",
    ]);
  });

  it("gives up after one retry", async () => {
    const client = fakeClient(reply("not json"), reply("still not json"));
    const error = await call(client).catch((err) => err);
    expect(error).toBeInstanceOf(LlmError);
    expect(error).toMatchObject({
      attempts: 2,
      rejected: ["The answer wasn't valid JSON."],
    });
    expect(client.requests).toHaveLength(2);
  });

  it("doesn't retry a refusal", async () => {
    const client = fakeClient(reply("", { stop_reason: "refusal" }));
    await expect(call(client)).rejects.toThrow(
      "test: the model declined the request",
    );
    expect(client.requests).toHaveLength(1);
  });

  it("wraps API errors", async () => {
    const client = fakeClient(new Error("529 Overloaded"));
    await expect(call(client)).rejects.toMatchObject({
      name: "LlmError",
      message: "test: 529 Overloaded",
    });
  });
});
