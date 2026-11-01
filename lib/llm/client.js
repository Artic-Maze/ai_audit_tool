import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// Thrown when a call can't produce a valid answer, even after its retry.
export class LlmError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LlmError";
    Object.assign(this, details);
  }
}

let defaultClient;

// The SDK retries rate limits, overloads and connection errors twice itself.
function anthropic() {
  defaultClient ??= new Anthropic({ timeout: 120_000, maxRetries: 2 });
  return defaultClient;
}

// The parsed answer, or the problems to send back with the retry.
function readResponse(response, schema, check) {
  if (response.stop_reason === "refusal") return { refused: true };
  if (response.stop_reason === "max_tokens") {
    return {
      problems: [
        "The answer was cut off at the length limit. Keep it shorter.",
      ],
    };
  }
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { problems: ["The answer wasn't valid JSON."] };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { problems: [z.prettifyError(parsed.error)] };
  const problems = check(parsed.data);
  return problems.length ? { problems } : { data: parsed.data };
}

// One structured call. The answer must match `schema` (enforced by the API's
// structured outputs, then re-checked with zod) and pass `check`, which
// returns a list of problems. On failure the request is sent once more with
// those problems appended to the prompt; if that fails too, LlmError.
export async function generate({
  name,
  system,
  prompt,
  schema,
  check = () => [],
  maxTokens = 16_000,
  effort = "medium",
  client = anthropic(),
}) {
  const format = betaZodOutputFormat(schema);
  const usage = { inputTokens: 0, outputTokens: 0 };
  // Why the first answer was rejected, kept for diagnosing retries.
  let rejected = [];
  let problems = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const content = problems.length
      ? `${prompt}\n\nYour previous answer was rejected:\n${problems.map((p) => `- ${p}`).join("\n")}\nAnswer again with these fixed.`
      : prompt;
    let response;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        // Retries a policy decline on Anthropic's recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        output_config: { format, effort },
        messages: [{ role: "user", content }],
      });
    } catch (err) {
      throw new LlmError(`${name}: ${err.message}`, {
        usage,
        attempts: attempt,
        rejected,
      });
    }
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;

    const result = readResponse(response, schema, check);
    if (result.data) {
      return {
        data: result.data,
        usage,
        attempts: attempt,
        rejected,
        model: response.model,
      };
    }
    if (result.refused) {
      throw new LlmError(`${name}: the model declined the request`, {
        usage,
        attempts: attempt,
        rejected,
      });
    }
    problems = result.problems;
    if (attempt === 1) rejected = problems;
  }
  throw new LlmError(
    `${name}: still invalid after a retry (${problems.join(" ")})`,
    {
      usage,
      attempts: 2,
      rejected,
    },
  );
}
