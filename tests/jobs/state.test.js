import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  domainKey,
  isFinished,
  isStale,
  STAGES,
  stageById,
  STALE_MS,
} from "../../lib/jobs/state.js";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("audit stages", () => {
  it("cover every stage the pipeline reports", () => {
    const reported = [
      ...(
        source("../../lib/crawl/index.js") + source("../../lib/audit.js")
      ).matchAll(/onProgress\("([a-z_]+)"\)/g),
    ].map((m) => m[1]);
    expect(reported).toEqual([
      "detecting",
      "products",
      "product_pages",
      "search",
      "pagespeed",
      "writing",
    ]);
    for (const id of reported) expect(stageById).toHaveProperty(id);
  });

  it("only move progress forward", () => {
    const progress = STAGES.map((s) => s.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(STAGES.at(-1)).toMatchObject({ id: "done", progress: 100 });
  });
});

describe("isStale", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const ago = (ms) => new Date(now - ms).toISOString();

  it("flags unfinished audits that stopped making progress", () => {
    expect(
      isStale({ status: "crawling", updatedAt: ago(STALE_MS + 1) }, now),
    ).toBe(true);
    expect(
      isStale({ status: "queued", updatedAt: ago(STALE_MS + 1) }, now),
    ).toBe(true);
  });

  it("leaves recent and finished audits alone", () => {
    expect(isStale({ status: "analyzing", updatedAt: ago(60_000) }, now)).toBe(
      false,
    );
    expect(
      isStale({ status: "done", updatedAt: ago(STALE_MS * 10) }, now),
    ).toBe(false);
    expect(
      isStale({ status: "failed", updatedAt: ago(STALE_MS * 10) }, now),
    ).toBe(false);
  });
});

describe("domainKey", () => {
  it("treats www and bare domains as the same store", () => {
    expect(domainKey("https://www.allbirds.com")).toBe("allbirds.com");
    expect(domainKey("https://allbirds.com")).toBe("allbirds.com");
  });

  it("keeps other subdomains", () => {
    expect(domainKey("https://shop.example.com")).toBe("shop.example.com");
  });
});

describe("isFinished", () => {
  it("is true only for done and failed", () => {
    expect(
      ["queued", "crawling", "analyzing", "done", "failed"].map(isFinished),
    ).toEqual([false, false, false, true, true]);
  });
});
