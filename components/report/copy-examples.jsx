import { ArrowUpRight } from "lucide-react";
import { Eyebrow } from "./primitives";

const PLACEHOLDER = /(\[[^\]]+\])/;

// Bracketed placeholders are details the merchant should fill in.
function WithPlaceholders({ text }) {
  return text.split(PLACEHOLDER).map((part, i) =>
    PLACEHOLDER.test(part) ? (
      <mark key={i} className="rounded bg-signal/20 px-1 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// The rewrite is plain text: paragraphs split by blank lines, bullets as
// lines starting with "- ".
function Rewrite({ text }) {
  return text.split(/\n\s*\n/).map((block, i) => {
    const groups = [];
    for (const line of block.split("\n")) {
      const bullet = line.trim().startsWith("- ");
      const last = groups.at(-1);
      if (last && last.bullet === bullet) last.lines.push(line);
      else groups.push({ bullet, lines: [line] });
    }
    return (
      <div key={i} className="space-y-2">
        {groups.map((group, j) =>
          group.bullet ? (
            <ul key={j} className="list-disc space-y-1 pl-5">
              {group.lines.map((line, k) => (
                <li key={k}>
                  <WithPlaceholders text={line.trim().slice(2)} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={j}>
              <WithPlaceholders text={group.lines.join(" ")} />
            </p>
          ),
        )}
      </div>
    );
  });
}

export function CopyExamples({ copyExamples }) {
  if (copyExamples.status !== "ok") {
    return (
      <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        {copyExamples.note}
      </p>
    );
  }
  return (
    <>
      <ol className="space-y-3">
        {copyExamples.items.map((item) => (
          <li
            key={item.handle}
            className="rounded-2xl border bg-card p-5 sm:p-6"
          >
            <h3 className="text-lg font-extrabold tracking-[-0.01em]">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded hover:text-growth"
              >
                {item.title}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </h3>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <Eyebrow>Before · {item.beforeWordCount} words</Eyebrow>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.before || "No description."}
                </p>
              </div>
              <div className="border-l-2 border-growth pl-4">
                <Eyebrow className="text-growth">
                  After · {item.afterWordCount} words
                </Eyebrow>
                <div className="mt-2 space-y-3 text-sm">
                  <Rewrite text={item.after} />
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm">
              <span className="font-bold">Why it&apos;s better:</span>{" "}
              {item.whyBetter}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Highlighted brackets mark details for you to fill in. Review every draft
        before publishing.
      </p>
    </>
  );
}
